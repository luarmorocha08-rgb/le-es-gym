"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { dbErrorMessage, requireAdminId } from "@/lib/action-utils";
import { withUser } from "@/lib/db";
import { announcementSchema, exerciseSchema, hourSchema, slugify, type FormState } from "@/lib/validation/admin";

const uuid = z.uuid();

function issues(error: z.ZodError): FormState {
  const fieldErrors: Record<string, string> = {};
  for (const i of error.issues) fieldErrors[String(i.path[0] ?? "form")] ??= i.message;
  return { message: "Revise os campos destacados.", fieldErrors };
}

// ---------------------------------------------------------------------------
// Profissionais
// ---------------------------------------------------------------------------
const reviewSchema = z.object({
  userId: z.uuid(),
  status: z.enum(["aprovado", "rejeitado", "suspenso", "pendente"]),
  note: z.string().trim().max(500).default(""),
});

/** Aprovar, rejeitar, suspender ou reativar — sempre auditado e notificado pelo banco. */
export async function reviewProfessional(_prev: FormState, formData: FormData): Promise<FormState> {
  const adminId = await requireAdminId();
  const parsed = reviewSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { message: "Dados inválidos." };
  const { userId, status, note } = parsed.data;
  if ((status === "rejeitado" || status === "suspenso") && note.length < 5) {
    return { message: "Informe o motivo (ele é enviado ao profissional).", fieldErrors: { note: "Informe o motivo." } };
  }
  try {
    await withUser(adminId, (db) => db.query("select public.review_professional($1, $2, $3)", [userId, status, note || null]));
  } catch (error) {
    return { message: dbErrorMessage(error) };
  }
  revalidatePath("/admin", "layout");
  revalidatePath("/equipe");
  // o cadastro muda de aba: mostra o resultado na aba do novo status
  redirect(`/admin/profissionais?status=${status}&revisado=${userId}`);
}

// ---------------------------------------------------------------------------
// Papéis
// ---------------------------------------------------------------------------
export async function setAdminRole(userId: string, grant: boolean) {
  const adminId = await requireAdminId();
  if (!uuid.safeParse(userId).success) return { ok: false, message: "Usuário inválido." } as const;
  try {
    await withUser(adminId, (db) => db.query("select public.set_user_role($1, 'admin', $2)", [userId, grant]));
  } catch (error) {
    return { ok: false, message: dbErrorMessage(error) } as const;
  }
  revalidatePath("/admin", "layout");
  return { ok: true, message: grant ? "Acesso de administrador concedido." : "Acesso de administrador removido." } as const;
}

// ---------------------------------------------------------------------------
// Vínculos
// ---------------------------------------------------------------------------
const linkSchema = z.object({ trainerId: z.uuid({ error: "Escolha o profissional." }), studentId: z.uuid({ error: "Escolha o aluno." }) });

export async function createLink(_prev: FormState, formData: FormData): Promise<FormState> {
  const adminId = await requireAdminId();
  const parsed = linkSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { message: parsed.error.issues[0]?.message };
  try {
    await withUser(adminId, (db) => db.query("select public.link_trainer_student($1, $2, true)", [parsed.data.trainerId, parsed.data.studentId]));
  } catch (error) {
    const e = error as { code?: string; message?: string };
    return { message: e.code === "23505" ? (e.message ?? "Este vínculo já está ativo.") : dbErrorMessage(error) };
  }
  revalidatePath("/admin", "layout");
  return { ok: true, message: "Vínculo criado. Profissional e aluno foram notificados." };
}

export async function endLink(trainerId: string, studentId: string) {
  const adminId = await requireAdminId();
  if (!uuid.safeParse(trainerId).success || !uuid.safeParse(studentId).success) return { ok: false, message: "Dados inválidos." } as const;
  try {
    await withUser(adminId, (db) => db.query("select public.link_trainer_student($1, $2, false)", [trainerId, studentId]));
  } catch (error) {
    return { ok: false, message: dbErrorMessage(error) } as const;
  }
  revalidatePath("/admin", "layout");
  return { ok: true } as const;
}

// ---------------------------------------------------------------------------
// Biblioteca de exercícios
// ---------------------------------------------------------------------------
export async function saveExercise(id: string | null, _prev: FormState, formData: FormData): Promise<FormState> {
  const adminId = await requireAdminId();
  if (id && !uuid.safeParse(id).success) return { message: "Exercício inválido." };
  const parsed = exerciseSchema.safeParse({
    ...Object.fromEntries(formData),
    primaryMuscles: formData.getAll("primaryMuscles"),
    secondaryMuscles: formData.getAll("secondaryMuscles"),
  });
  if (!parsed.success) return issues(parsed.error);
  const e = parsed.data;
  const slug = slugify(e.slug ?? e.name);
  if (!slug) return { message: "Revise os campos destacados.", fieldErrors: { slug: "Identificador inválido." } };
  const secondary = e.secondaryMuscles.filter((m) => !e.primaryMuscles.includes(m));
  const values = [slug, e.name, e.primaryMuscles, secondary, e.equipment, e.mechanics, e.level, e.instructions, e.tips, e.videoUrl];

  let savedId: string;
  try {
    savedId = await withUser(adminId, async (db) => {
      if (id) {
        const row = await db.one<{ id: string }>(
          `update public.exercises set slug = $2, name = $3, primary_muscles = $4, secondary_muscles = $5, equipment = $6,
                  mechanics = $7, level = $8, instructions = $9, tips = $10, video_url = $11
            where id = $1 returning id`,
          [id, ...values],
        );
        if (!row) throw Object.assign(new Error("Exercício não encontrado."), { code: "P0002" });
        return row.id;
      }
      const row = await db.one<{ id: string }>(
        `insert into public.exercises (slug, name, primary_muscles, secondary_muscles, equipment, mechanics, level, instructions, tips, video_url, created_by)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) returning id`,
        [...values, adminId],
      );
      return row!.id;
    });
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      return { message: "Já existe um exercício com este identificador.", fieldErrors: { slug: "Identificador em uso — ajuste o nome ou o identificador." } };
    }
    return { message: dbErrorMessage(error, "Não foi possível salvar o exercício.") };
  }
  revalidatePath("/admin/exercicios", "layout");
  revalidatePath("/aluno/exercicios", "layout");
  if (!id) redirect(`/admin/exercicios/${savedId}?criado=1`);
  return { ok: true, message: "Exercício atualizado." };
}

export async function setExerciseActive(id: string, active: boolean) {
  const adminId = await requireAdminId();
  if (!uuid.safeParse(id).success) return { ok: false, message: "Exercício inválido." } as const;
  try {
    await withUser(adminId, (db) => db.query("update public.exercises set is_active = $2 where id = $1", [id, active]));
  } catch (error) {
    return { ok: false, message: dbErrorMessage(error) } as const;
  }
  revalidatePath("/admin/exercicios", "layout");
  revalidatePath("/aluno/exercicios", "layout");
  return { ok: true } as const;
}

// ---------------------------------------------------------------------------
// Horários (lidos pela landing pública)
// ---------------------------------------------------------------------------
export async function addHours(_prev: FormState, formData: FormData): Promise<FormState> {
  const adminId = await requireAdminId();
  const parsed = hourSchema.safeParse({ ...Object.fromEntries(formData), weekdays: formData.getAll("weekdays") });
  if (!parsed.success) return issues(parsed.error);
  const h = parsed.data;
  try {
    await withUser(adminId, async (db) => {
      for (const weekday of h.weekdays) {
        await db.query("insert into public.opening_hours (weekday, opens_at, closes_at, note) values ($1, $2, $3, $4)", [weekday, h.opensAt, h.closesAt, h.note]);
      }
    });
  } catch (error) {
    return { message: dbErrorMessage(error, "Não foi possível salvar o horário.") };
  }
  revalidatePath("/", "layout");
  return { ok: true, message: h.weekdays.length > 1 ? `${h.weekdays.length} faixas adicionadas.` : "Faixa adicionada." };
}

export async function deleteHour(id: string) {
  const adminId = await requireAdminId();
  if (!uuid.safeParse(id).success) return { ok: false, message: "Horário inválido." } as const;
  try {
    await withUser(adminId, (db) => db.query("delete from public.opening_hours where id = $1", [id]));
  } catch (error) {
    return { ok: false, message: dbErrorMessage(error) } as const;
  }
  revalidatePath("/", "layout");
  return { ok: true } as const;
}

// ---------------------------------------------------------------------------
// Conteúdo: aviso exibido no topo do site
// ---------------------------------------------------------------------------
export async function saveAnnouncement(_prev: FormState, formData: FormData): Promise<FormState> {
  const adminId = await requireAdminId();
  const parsed = announcementSchema.safeParse({ ...Object.fromEntries(formData), active: formData.get("active") === "on" });
  if (!parsed.success) return issues(parsed.error);
  try {
    await withUser(adminId, (db) =>
      db.query(
        `insert into public.site_content (key, value, updated_by) values ('aviso', $1, $2)
         on conflict (key) do update set value = excluded.value, updated_by = excluded.updated_by`,
        [JSON.stringify(parsed.data), adminId],
      ),
    );
  } catch (error) {
    return { message: dbErrorMessage(error, "Não foi possível salvar o aviso.") };
  }
  revalidatePath("/", "layout");
  return { ok: true, message: parsed.data.active ? "Aviso publicado no site." : "Aviso salvo (desativado)." };
}
