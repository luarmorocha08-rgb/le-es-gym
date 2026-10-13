/** Rótulos e opções compartilhados pelo portal (espelham os enums do banco). */

export const SPLIT_TYPES = ["ABC", "ABCD", "ABCDE", "FULL_BODY", "UPPER_LOWER", "PERSONALIZADO"] as const;
export type SplitType = (typeof SPLIT_TYPES)[number];

export const SPLIT_LABELS: Record<SplitType, string> = {
  ABC: "ABC",
  ABCD: "ABCD",
  ABCDE: "ABCDE",
  FULL_BODY: "Full Body",
  UPPER_LOWER: "Upper / Lower",
  PERSONALIZADO: "Personalizado",
};

export const GOALS = ["hipertrofia", "forca", "emagrecimento", "condicionamento", "saude", "resistencia", "outro"] as const;
export type Goal = (typeof GOALS)[number];
export const GOAL_LABELS: Record<Goal, string> = {
  hipertrofia: "Hipertrofia",
  forca: "Força",
  emagrecimento: "Emagrecimento",
  condicionamento: "Condicionamento",
  saude: "Saúde e bem-estar",
  resistencia: "Resistência",
  outro: "Outro",
};

export const LEVELS = ["iniciante", "intermediario", "avancado"] as const;
export type Level = (typeof LEVELS)[number];
export const LEVEL_LABELS: Record<Level, string> = {
  iniciante: "Iniciante",
  intermediario: "Intermediário",
  avancado: "Avançado",
};

export const MUSCLE_LABELS: Record<string, string> = {
  peito: "Peito",
  costas: "Costas",
  ombros: "Ombros",
  biceps: "Bíceps",
  triceps: "Tríceps",
  antebracos: "Antebraços",
  quadriceps: "Quadríceps",
  posteriores: "Posteriores",
  gluteos: "Glúteos",
  panturrilhas: "Panturrilhas",
  abdomen: "Abdômen",
  lombar: "Lombar",
  cardio: "Cardio",
};

export function muscleLabel(m: string) {
  return MUSCLE_LABELS[m] ?? m.charAt(0).toUpperCase() + m.slice(1);
}

export const PLAN_STATUS_LABELS: Record<string, string> = {
  rascunho: "Rascunho",
  ativo: "Em uso",
  em_revisao: "Em revisão",
  publicado: "Publicado pelo profissional",
  arquivado: "Arquivado",
};

export const PLAN_SOURCE_LABELS: Record<string, string> = {
  aluno: "Montado por você",
  profissional: "Prescrição profissional",
  ia: "Sugestão de IA",
};

export const REQUEST_STATUS_LABELS: Record<string, string> = {
  aguardando_profissional: "Aguardando profissional",
  em_analise: "Em análise",
  em_elaboracao: "Em elaboração",
  entregue: "Entregue",
  ajuste_solicitado: "Ajuste solicitado",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

export const MEASUREMENTS = [
  { key: "cintura_cm", label: "Cintura (cm)" },
  { key: "quadril_cm", label: "Quadril (cm)" },
  { key: "peito_cm", label: "Peito (cm)" },
  { key: "braco_cm", label: "Braço (cm)" },
  { key: "coxa_cm", label: "Coxa (cm)" },
] as const;
