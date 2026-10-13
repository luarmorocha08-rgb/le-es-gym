/** Configuração da IA lida em tempo de execução (somente servidor). */
export const DEFAULT_AI_MODEL = "claude-opus-5-5";

export type Effort = "low" | "medium" | "high" | "xhigh" | "max";

export function aiConfig() {
  const effort = (process.env.AI_EFFORT ?? "medium") as Effort;
  return {
    provider: process.env.AI_PROVIDER ?? "anthropic",
    model: process.env.AI_MODEL || DEFAULT_AI_MODEL,
    effort: ["low", "medium", "high", "xhigh", "max"].includes(effort) ? effort : "medium",
    dailyLimit: Math.max(1, Number(process.env.AI_DAILY_LIMIT_PER_USER ?? 10) || 10),
  };
}

/** Sem chave do provedor, nada é gerado nem simulado. */
export function isAiConfigured() {
  return aiConfig().provider === "anthropic" && Boolean(process.env.ANTHROPIC_API_KEY);
}

/** Modelos com fallback de recusa no servidor (`fallbacks: "default"`). */
export function supportsServerFallback(model: string) {
  return /^claude-(opus-5|fable-5-1|sonnet-5-5)/.test(model);
}
