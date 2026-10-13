/** Cálculos puros de evolução e sequência de treinos (testáveis, sem I/O). */

/** Índice do próximo dia da ficha, dado o dia do último treino concluído. */
export function nextDayIndex(dayIds: string[], lastCompletedDayId: string | null | undefined) {
  if (dayIds.length === 0) return -1;
  const i = lastCompletedDayId ? dayIds.indexOf(lastCompletedDayId) : -1;
  return i === -1 ? 0 : (i + 1) % dayIds.length;
}

const SAO_PAULO = "America/Sao_Paulo";

/** Data local (YYYY-MM-DD) no fuso da academia. */
export function localDate(d: Date | string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: SAO_PAULO }).format(new Date(d));
}

/** Segunda-feira (YYYY-MM-DD) da semana da data informada, no fuso da academia. */
export function weekStart(d: Date | string) {
  const [y, m, day] = localDate(d).split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, day));
  const dow = (utc.getUTCDay() + 6) % 7; // 0 = segunda
  utc.setUTCDate(utc.getUTCDate() - dow);
  return utc.toISOString().slice(0, 10);
}

/** Os 7 dias (YYYY-MM-DD) da semana atual, de segunda a domingo. */
export function currentWeekDays(now = new Date()) {
  const start = new Date(`${weekStart(now)}T00:00:00Z`);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

/** Contagem de treinos por semana nas últimas `weeks` semanas (mais antiga primeiro). */
export function weeklyFrequency(sessionDates: (Date | string)[], weeks = 8, now = new Date()) {
  const thisWeek = new Date(`${weekStart(now)}T00:00:00Z`);
  const buckets = Array.from({ length: weeks }, (_, i) => {
    const d = new Date(thisWeek);
    d.setUTCDate(thisWeek.getUTCDate() - 7 * (weeks - 1 - i));
    return { week: d.toISOString().slice(0, 10), count: 0 };
  });
  const index = new Map(buckets.map((b, i) => [b.week, i]));
  for (const date of sessionDates) {
    const i = index.get(weekStart(date));
    if (i !== undefined) buckets[i].count++;
  }
  return buckets;
}

export type SetRecord = { exerciseId: string; exerciseName: string; reps: number; loadKg: number | null; date: string };

/** Volume (séries × reps × carga) de um conjunto de séries. */
export function volume(sets: { reps: number; loadKg: number | null }[]) {
  return sets.reduce((sum, s) => sum + s.reps * (s.loadKg ?? 0), 0);
}

/** Maior carga registrada por exercício (com repetições > 0). */
export function personalRecords(sets: SetRecord[]) {
  const best = new Map<string, SetRecord>();
  for (const s of sets) {
    if (s.loadKg === null || s.reps <= 0) continue;
    const cur = best.get(s.exerciseId);
    if (!cur || s.loadKg > cur.loadKg! || (s.loadKg === cur.loadKg && s.reps > cur.reps)) best.set(s.exerciseId, s);
  }
  return [...best.values()].sort((a, b) => a.exerciseName.localeCompare(b.exerciseName, "pt-BR"));
}

/** Melhor carga por dia para um exercício (série histórica do gráfico). */
export function loadSeries(sets: SetRecord[], exerciseId: string) {
  const byDay = new Map<string, number>();
  for (const s of sets) {
    if (s.exerciseId !== exerciseId || s.loadKg === null) continue;
    const day = localDate(s.date);
    byDay.set(day, Math.max(byDay.get(day) ?? 0, s.loadKg));
  }
  return [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, value]) => ({ date, value }));
}

/** Formata segundos como m:ss. */
export function formatClock(totalSeconds: number) {
  const s = Math.max(0, Math.round(totalSeconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Número de repetições sugerido a partir do alvo ("8-12" → 12, "10" → 10, "falha" → null). */
export function defaultReps(target: string) {
  if (target === "falha") return null;
  const parts = target.split("-").map(Number);
  return parts[parts.length - 1] ?? null;
}

/** Itens cuja data cai nos últimos `days` dias. */
export function withinLastDays<T>(items: T[], getDate: (item: T) => string | Date, days: number, now = Date.now()) {
  return items.filter((i) => now - new Date(getDate(i)).getTime() < days * 86_400_000);
}
