import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";
import { aiConfig, isAiConfigured, supportsServerFallback } from "./config";

export type AiErrorCode = "not_configured" | "refusal" | "rate_limited" | "unavailable" | "invalid" | "auth" | "limit" | "consent";

export class AiError extends Error {
  constructor(
    public code: AiErrorCode,
    message: string,
  ) {
    super(message);
  }
}

declare global {
  var __leoesAnthropic: Anthropic | undefined;
}

function getClient() {
  if (!isAiConfigured()) throw new AiError("not_configured", "A inteligência artificial ainda não foi configurada.");
  globalThis.__leoesAnthropic ??= new Anthropic({ timeout: 120_000, maxRetries: 2 });
  return globalThis.__leoesAnthropic;
}

export type ModelCall<T> = { output: T; model: string; inputTokens: number; outputTokens: number };

/**
 * Uma chamada com saída estruturada validada pelo SDK (Zod). O bloco de regras
 * e o catálogo vão no system prompt (estável → cache); dados do pedido na
 * mensagem do usuário.
 */
export async function callStructured<S extends z.ZodType>({
  schema,
  system,
  cacheable,
  user,
  maxTokens = 16000,
}: {
  schema: S;
  system: string;
  cacheable?: string;
  user: string;
  maxTokens?: number;
}): Promise<ModelCall<z.infer<S>>> {
  const client = getClient();
  const { model, effort } = aiConfig();
  const fallback = supportsServerFallback(model);

  try {
    const response = await client.beta.messages.parse({
      model,
      max_tokens: maxTokens,
      ...(fallback ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
      system: [
        { type: "text", text: system },
        ...(cacheable ? [{ type: "text" as const, text: cacheable, cache_control: { type: "ephemeral" as const } }] : []),
      ],
      messages: [{ role: "user", content: user }],
      output_config: { format: betaZodOutputFormat(schema), effort },
    });

    if (response.stop_reason === "refusal") {
      throw new AiError("refusal", "A IA não pôde atender a este pedido. Reformule ou fale com um profissional da academia.");
    }
    if (response.stop_reason === "max_tokens" || !response.parsed_output) {
      throw new AiError("invalid", "A resposta da IA veio incompleta. Tente novamente.");
    }
    return {
      output: response.parsed_output as z.infer<S>,
      model: response.model,
      inputTokens: response.usage.input_tokens + (response.usage.cache_read_input_tokens ?? 0) + (response.usage.cache_creation_input_tokens ?? 0),
      outputTokens: response.usage.output_tokens,
    };
  } catch (error) {
    if (error instanceof AiError) throw error;
    if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
      throw new AiError("auth", "A chave da IA é inválida ou sem permissão. Avise a administração.");
    }
    if (error instanceof Anthropic.RateLimitError) {
      throw new AiError("rate_limited", "A IA está com muita demanda agora. Tente de novo em instantes.");
    }
    if (error instanceof Anthropic.BadRequestError) {
      console.error("[ai] requisição inválida", error.message);
      throw new AiError("invalid", "Não foi possível processar o pedido na IA.");
    }
    if (error instanceof Anthropic.APIConnectionError || error instanceof Anthropic.InternalServerError || error instanceof Anthropic.APIError) {
      throw new AiError("unavailable", "A IA está indisponível no momento. Tente novamente em alguns minutos.");
    }
    // Erro de validação do schema (saída fora do formato)
    console.error("[ai] falha inesperada", error);
    throw new AiError("invalid", "A IA retornou uma resposta fora do formato esperado.");
  }
}
