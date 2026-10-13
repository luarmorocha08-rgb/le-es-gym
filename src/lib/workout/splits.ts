import type { SplitType } from "./constants";

export type DayTemplate = { label: string; name: string };

/** Estrutura inicial de dias para cada divisão (o aluno pode renomear tudo). */
export const SPLIT_TEMPLATES: Record<SplitType, DayTemplate[]> = {
  ABC: [
    { label: "A", name: "Peito, ombros e tríceps" },
    { label: "B", name: "Costas e bíceps" },
    { label: "C", name: "Pernas e abdômen" },
  ],
  ABCD: [
    { label: "A", name: "Peito e tríceps" },
    { label: "B", name: "Costas e bíceps" },
    { label: "C", name: "Pernas" },
    { label: "D", name: "Ombros e abdômen" },
  ],
  ABCDE: [
    { label: "A", name: "Peito" },
    { label: "B", name: "Costas" },
    { label: "C", name: "Pernas" },
    { label: "D", name: "Ombros" },
    { label: "E", name: "Braços e abdômen" },
  ],
  FULL_BODY: [
    { label: "A", name: "Corpo inteiro A" },
    { label: "B", name: "Corpo inteiro B" },
  ],
  UPPER_LOWER: [
    { label: "Upper A", name: "Membros superiores" },
    { label: "Lower A", name: "Membros inferiores" },
    { label: "Upper B", name: "Membros superiores" },
    { label: "Lower B", name: "Membros inferiores" },
  ],
  PERSONALIZADO: [{ label: "A", name: "Treino A" }],
};

/** Próximo rótulo livre ("A", "B", …) para dias adicionados manualmente. */
export function nextDayLabel(existing: string[]) {
  for (let i = 0; i < 26; i++) {
    const label = String.fromCharCode(65 + i);
    if (!existing.includes(label)) return label;
  }
  return String(existing.length + 1);
}
