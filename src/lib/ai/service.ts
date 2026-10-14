import "server-only";
import { getPool, withUser } from "@/lib/db";
import { personalRecords } from "@/lib/workout/progress";
import { AiError, callStructured, type ModelCall } from "./client";
import { aiConfig } from "./config";
import { InvalidSuggestionError, normalizeSuggestion, redactFreeText } from "./normalize";
import {
  buildAdjustPrompt,
  buildExplainPrompt,
  buildGenerationPrompt,
  buildSubstitutesPrompt,
  catalogBlock,
  SYSTEM_RULES,
  type CatalogItem,
  type TrainingHistory,
} from "./prompts";
import {
  modelExplanationSchema,
  modelSubstitutesSchema,
  modelSuggestionSchema,
  type AiProfileInput,
  type Suggestion,
} from "./schemas";

type Kind = "gerar_treino" | "ajustar_treino" | "substituir_exercicio" | "explicar_exercicio";

function ownerPool() {
  const pool = getPool();
  if (!pool) throw new AiError("not_configured", "Banco de dados não configurado.");
  return pool;
}

/** Limite diário por solicitante (inclui tentativas com erro, para conter abuso). */
async function assertWithinLimit(requesterId: string) {
  const { dailyLimit } = aiConfig();
  const { rows } = await ownerPool().query<{ n: number }>(
    "select count(*)::int as n from public.ai_generations where user_id = $1 and created_at > now() - interval '24 hours'",
    [requesterId],
  );
  if ((rows[0]?.n ?? 0) >= dailyLimit) {
    throw new AiError("limit", `Você atingiu o limite de ${dailyLimit} usos da IA nas últimas 24 horas.`);
  }
}

/**
 * Consentimento do aluno é obrigatório (inclusive quando um profissional
 * gera para ele) e o profissional precisa estar vinculado.
 */
async function assertAllowed(requesterId: string, studentId: string) {
  if (requesterId !== studentId) {
    const linked = await withUser(requesterId, (db) => db.one<{ ok: boolean }>("select public.is_linked_trainer($1) as ok", [studentId]));
    if (!linked?.ok) throw new AiError("consent", "Você não está vinculado a este aluno.");
  }
  const { rows } = await ownerPool().query<{ ok: boolean }>(
    "select ai_consent_at is not null as ok from public.profiles where id = $1",
    [studentId],
  );
  if (!rows[0]?.ok) {
    throw new AiError(
      "consent",
      requesterId === studentId
        ? "Para usar a IA, autorize o envio dos seus dados de treino ao provedor de IA."
        : "O aluno ainda não autorizou o uso de IA com os dados de treino dele.",
    );
  }
}

async function log(entry: {
  userId: string;
  studentId: string | null;
  kind: Kind;
  input: unknown;
  output?: unknown;
  status: "sucesso" | "erro" | "invalido" | "bloqueado";
  error?: string;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs: number;
}) {
  const { rows } = await ownerPool().query<{ id: string }>(
    `insert into public.ai_generations (user_id, student_id, kind, provider, model, input, output, status, error_message,
                                        input_tokens, output_tokens, latency_ms)
     values ($1, $2, $3, 'anthropic', $4, $5, $6, $7, $8, $9, $10, $11) returning id`,
    [
      entry.userId,
      entry.studentId,
      entry.kind,
      entry.model ?? aiConfig().model,
      JSON.stringify(entry.input),
      entry.output === undefined ? null : JSON.stringify(entry.output),
      entry.status,
      entry.error ?? null,
      entry.inputTokens ?? null,
      entry.outputTokens ?? null,
      entry.latencyMs,
    ],
  );
  return rows[0].id;
}

/** Executa a chamada registrando sucesso, recusa ou erro em ai_generations. */
async function run<T, R>(
  meta: { userId: string; studentId: string | null; kind: Kind; input: unknown },
  call: () => Promise<ModelCall<T>>,
  finalize: (output: T) => R,
): Promise<{ generationId: string; result: R }> {
  const started = Date.now();
  try {
    const res = await call();
    let result: R;
    try {
      result = finalize(res.output);
    } catch (error) {
      if (error instanceof InvalidSuggestionError) {
        await log({ ...meta, output: res.output, status: "invalido", error: error.message, model: res.model, inputTokens: res.inputTokens, outputTokens: res.outputTokens, latencyMs: Date.now() - started });
        throw new AiError("invalid", "A IA gerou uma sugestão que não passou na validação. Tente novamente.");
      }
      throw error;
    }
    const generationId = await log({ ...meta, output: result, status: "sucesso", model: res.model, inputTokens: res.inputTokens, outputTokens: res.outputTokens, latencyMs: Date.now() - started });
    return { generationId, result };
  } catch (error) {
    if (error instanceof AiError && (error.code !== "invalid" || error.detail)) {
      const reason = error.detail ? `${error.code}: ${error.detail}` : error.code;
      await log({ ...meta, status: error.code === "refusal" ? "bloqueado" : "erro", error: reason, latencyMs: Date.now() - started }).catch(() => {});
    }
    throw error;
  }
}

export async function loadCatalog(userId: string) {
  return withUser(userId, (db) =>
    db.query<CatalogItem>(
      `select id, slug, name, primary_muscles, secondary_muscles, equipment, level::text
         from public.exercises where is_active order by slug`,
    ),
  );
}

/** Histórico sem dados pessoais: contagem de treinos e melhores cargas. */
export async function loadHistory(requesterId: string, studentId: string): Promise<TrainingHistory> {
  return withUser(requesterId, async (db) => {
    const s = await db.one<{ n: number }>(
      "select count(*)::int as n from public.workout_sessions where student_id = $1 and status = 'concluida' and finished_at > now() - interval '28 days'",
      [studentId],
    );
    const sets = await db.query<{ exercise_id: string; name: string; reps: number; load_kg: string | null; completed_at: string }>(
      `select c.exercise_id, e.name, c.reps, c.load_kg, c.completed_at from public.completed_sets c
         join public.exercises e on e.id = c.exercise_id
        where c.student_id = $1 and c.completed_at > now() - interval '120 days'`,
      [studentId],
    );
    const prs = personalRecords(sets.map((x) => ({ exerciseId: x.exercise_id, exerciseName: x.name, reps: x.reps, loadKg: x.load_kg === null ? null : Number(x.load_kg), date: x.completed_at })));
    return { sessions28d: s?.n ?? 0, bestLoads: prs.slice(0, 10).map((p) => ({ name: p.exerciseName, loadKg: p.loadKg!, reps: p.reps })) };
  });
}

/** Remove possíveis dados pessoais dos textos livres antes do envio. */
export function minimizeInput(input: AiProfileInput): AiProfileInput {
  return {
    ...input,
    preferences: redactFreeText(input.preferences),
    limitations: redactFreeText(input.limitations),
    avoid: redactFreeText(input.avoid),
    extraInstructions: redactFreeText(input.extraInstructions),
  };
}

export async function generateSuggestion(params: { requesterId: string; studentId: string; input: AiProfileInput; withHistory?: boolean }) {
  await assertAllowed(params.requesterId, params.studentId);
  await assertWithinLimit(params.requesterId);
  const catalog = await loadCatalog(params.requesterId);
  const input = minimizeInput(params.input);
  const history = params.withHistory ? await loadHistory(params.requesterId, params.studentId) : null;
  const user = buildGenerationPrompt(input, history);
  return run(
    { userId: params.requesterId, studentId: params.studentId, kind: "gerar_treino", input: { profile: input, history } },
    () => callStructured({ schema: modelSuggestionSchema, system: SYSTEM_RULES, cacheable: catalogBlock(catalog), user }),
    (raw) => normalizeSuggestion(raw, catalog, { maxDays: Math.max(input.daysPerWeek, 1) + 1 }),
  );
}

/** Lê uma geração anterior do próprio solicitante (RLS: titular lê). */
export async function getGeneration(requesterId: string, generationId: string) {
  return withUser(requesterId, (db) =>
    db.one<{ id: string; student_id: string | null; kind: string; status: string; input: { profile?: AiProfileInput }; output: Suggestion | null; created_at: string }>(
      "select id, student_id, kind, status::text, input, output, created_at from public.ai_generations where id = $1 and user_id = $2",
      [generationId, requesterId],
    ),
  );
}

export async function adjustSuggestion(params: { requesterId: string; generationId: string; instruction: string }) {
  const previous = await getGeneration(params.requesterId, params.generationId);
  if (!previous?.output || previous.status !== "sucesso" || !previous.student_id) throw new AiError("invalid", "Sugestão anterior não encontrada.");
  await assertAllowed(params.requesterId, previous.student_id);
  await assertWithinLimit(params.requesterId);
  const catalog = await loadCatalog(params.requesterId);
  const instruction = redactFreeText(params.instruction) ?? "";
  const profile = previous.input?.profile ?? null;
  const user = buildAdjustPrompt(previous.output, instruction, profile);
  return run(
    { userId: params.requesterId, studentId: previous.student_id, kind: "ajustar_treino", input: { previous_generation: previous.id, instruction, profile } },
    () => callStructured({ schema: modelSuggestionSchema, system: SYSTEM_RULES, cacheable: catalogBlock(catalog), user }),
    (raw) => normalizeSuggestion(raw, catalog, { maxDays: 7 }),
  );
}

/** Sem aluno (ex.: modelo do profissional) nenhum dado pessoal é enviado — só o exercício. */
export async function suggestSubstitutes(params: { requesterId: string; studentId: string | null; exerciseId: string; reason?: string | null; equipment?: string[] }) {
  if (params.studentId) await assertAllowed(params.requesterId, params.studentId);
  await assertWithinLimit(params.requesterId);
  const catalog = await loadCatalog(params.requesterId);
  const target = catalog.find((c) => c.id === params.exerciseId);
  if (!target) throw new AiError("invalid", "Exercício não encontrado.");
  const reason = redactFreeText(params.reason ?? null);
  return run(
    { userId: params.requesterId, studentId: params.studentId, kind: "substituir_exercicio", input: { exercise: target.slug, reason } },
    () => callStructured({ schema: modelSubstitutesSchema, system: SYSTEM_RULES, cacheable: catalogBlock(catalog), user: buildSubstitutesPrompt(target, { reason, equipment: params.equipment }), maxTokens: 4000 }),
    (raw) => {
      const bySlug = new Map(catalog.map((c) => [c.slug, c]));
      const options = raw.options
        .filter((o) => bySlug.has(o.slug) && o.slug !== target.slug)
        .slice(0, 4)
        .map((o) => ({ exerciseId: bySlug.get(o.slug)!.id, name: bySlug.get(o.slug)!.name, reason: o.reason.slice(0, 200) }));
      if (!options.length) throw new InvalidSuggestionError("Nenhuma alternativa válida do catálogo.");
      return { options };
    },
  );
}

export async function explainExercise(params: { requesterId: string; slug: string; question: string }) {
  await assertAllowed(params.requesterId, params.requesterId);
  await assertWithinLimit(params.requesterId);
  const exercise = await withUser(params.requesterId, (db) =>
    db.one<CatalogItem & { instructions: string[] }>(
      "select id, slug, name, primary_muscles, secondary_muscles, equipment, level::text, instructions from public.exercises where slug = $1 and is_active",
      [params.slug],
    ),
  );
  if (!exercise) throw new AiError("invalid", "Exercício não encontrado.");
  const question = redactFreeText(params.question) ?? "";
  return run(
    { userId: params.requesterId, studentId: params.requesterId, kind: "explicar_exercicio", input: { exercise: exercise.slug, question } },
    () => callStructured({ schema: modelExplanationSchema, system: SYSTEM_RULES, user: buildExplainPrompt(exercise, question), maxTokens: 4000 }),
    (raw) => ({ answer: raw.answer.trim().slice(0, 1500), safety_note: raw.safety_note?.trim().slice(0, 400) || null }),
  );
}

export function aiErrorMessage(error: unknown) {
  if (error instanceof AiError) return { code: error.code, message: error.message };
  console.error("[ai]", error);
  return { code: "unavailable" as const, message: "Não foi possível falar com a IA agora." };
}
