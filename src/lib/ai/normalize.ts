import { REPS_PATTERN, type PlanInput } from "@/lib/validation/workout";
import type { PlanSnapshot } from "@/lib/workout/diff";
import type { CatalogItem } from "./prompts";
import type { ModelSuggestion, Suggestion } from "./schemas";

export class InvalidSuggestionError extends Error {}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(n)));

/**
 * Valida e normaliza a resposta do modelo contra o catálogo real:
 * exercícios desconhecidos são descartados (e listados), números são limitados
 * a faixas seguras e repetições fora do formato são rejeitadas.
 */
export function normalizeSuggestion(raw: ModelSuggestion, catalog: CatalogItem[], opts: { maxDays: number }): Suggestion {
  const bySlug = new Map(catalog.map((c) => [c.slug, c]));
  const dropped = new Set<string>();
  const labels = new Set<string>();

  const days = raw.days
    .slice(0, Math.min(7, opts.maxDays))
    .map((d, i) => {
      let label = (d.label || String.fromCharCode(65 + i)).trim().slice(0, 12);
      if (labels.has(label.toUpperCase())) label = `${label}${i + 1}`.slice(0, 12);
      labels.add(label.toUpperCase());
      const seen = new Set<string>();
      const exercises = d.exercises
        .filter((e) => {
          const known = bySlug.has(e.slug);
          if (!known) dropped.add(e.slug);
          if (!known || seen.has(e.slug)) return false;
          seen.add(e.slug);
          return true;
        })
        .slice(0, 12)
        .map((e) => {
          const c = bySlug.get(e.slug)!;
          const reps = e.reps.trim().toLowerCase();
          if (!REPS_PATTERN.test(reps)) throw new InvalidSuggestionError(`Repetições inválidas em ${c.name}: "${e.reps}"`);
          const [a, b] = reps.split("-").map(Number);
          if (reps !== "falha" && (a < 1 || (b !== undefined && b < a))) throw new InvalidSuggestionError(`Faixa inválida em ${c.name}`);
          return {
            exercise_id: c.id,
            slug: c.slug,
            name: c.name,
            primary_muscles: c.primary_muscles,
            sets: clamp(e.sets, 1, 8),
            reps,
            rest_seconds: clamp(e.rest_seconds, 0, 300),
            notes: e.notes?.trim().slice(0, 300) || null,
          };
        });
      return { label, name: (d.name || `Treino ${label}`).trim().slice(0, 80), exercises };
    })
    .filter((d) => d.exercises.length > 0);

  if (days.length === 0) throw new InvalidSuggestionError("A resposta não trouxe exercícios válidos do catálogo.");

  return {
    title: raw.title.trim().slice(0, 120) || "Sugestão de treino",
    split_type: raw.split_type,
    summary: raw.summary.trim().slice(0, 600),
    weekly_schedule: raw.weekly_schedule.trim().slice(0, 600),
    days,
    progression: raw.progression.trim().slice(0, 1200),
    general_tips: raw.general_tips.map((t) => t.trim()).filter(Boolean).slice(0, 5),
    safety_notes: raw.safety_notes.map((t) => t.trim()).filter(Boolean).slice(0, 5),
    requires_professional_evaluation: raw.requires_professional_evaluation,
    dropped_exercises: [...dropped],
  };
}

/** Sugestão → entrada do editor/salvamento de fichas. */
export function suggestionToPlanInput(s: Suggestion, goal: PlanInput["goal"] = null): PlanInput {
  const notes = [s.summary, s.weekly_schedule && `Organização: ${s.weekly_schedule}`].filter(Boolean).join("\n\n");
  return {
    title: s.title,
    splitType: s.split_type,
    goal,
    description: notes.slice(0, 2000),
    makeCurrent: false,
    days: s.days.map((d) => ({
      label: d.label,
      name: d.name,
      exercises: d.exercises.map((e) => ({ exerciseId: e.exercise_id, sets: e.sets, reps: e.reps, restSeconds: e.rest_seconds, targetLoadKg: null, notes: e.notes })),
    })),
  };
}

/** Sugestão → snapshot para comparar versões com diffPlans(). */
export function suggestionToSnapshot(s: Suggestion): PlanSnapshot {
  return {
    title: s.title,
    split_type: s.split_type,
    goal: null,
    description: null,
    days: s.days.map((d) => ({
      label: d.label,
      name: d.name,
      notes: null,
      exercises: d.exercises.map((e) => ({ exercise_id: e.exercise_id, exercise_name: e.name, sets: e.sets, reps: e.reps, rest_seconds: e.rest_seconds, target_load_kg: null, notes: e.notes })),
    })),
  };
}

/**
 * Minimização (LGPD): mantém só os campos de treino necessários e remove
 * padrões de dados pessoais que o usuário possa ter digitado nos textos livres.
 */
export function redactFreeText(value: string | null) {
  if (!value) return null;
  return value
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "[e-mail removido]")
    .replace(/(\+?55\s?)?(\(?\d{2}\)?\s?)?9?\d{4}[-\s]?\d{4}/g, "[telefone removido]")
    .replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, "[documento removido]");
}
