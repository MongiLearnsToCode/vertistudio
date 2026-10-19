import { findModel, type Effort } from '@shared/ai/models';

/** Beta header for server-side refusal fallback (`fallbacks: "default"`). */
export const FALLBACK_BETA = 'server-side-fallback-2026-07-01';

export interface ClaudeRequestOptions {
  prompt: string;
  /** Optional system prompt. */
  system?: string;
  /** Anthropic model id. Defaults to the `aiModel` setting. */
  model?: string;
  /** Output cap. Default 16000. */
  maxTokens?: number;
  /** How hard the model thinks (models that support it). Default 'medium'. */
  effort?: Effort;
}

/**
 * Builds the Messages API request body. Pure (no Electron, no network) so it is
 * unit-tested. Effort and refusal fallbacks are only sent to models that accept
 * them; unknown model ids get the plain request.
 */
export function buildRequestParams(options: ClaudeRequestOptions, defaultModel: string) {
  const model = options.model ?? defaultModel;
  const info = findModel(model);
  return {
    model,
    max_tokens: options.maxTokens ?? 16000,
    ...(options.system ? { system: options.system } : {}),
    messages: [{ role: 'user' as const, content: options.prompt }],
    ...(info?.supportsEffort ? { output_config: { effort: options.effort ?? 'medium' } } : {}),
    // If the model declines for safety reasons, the API retries on the model
    // Anthropic recommends for that case, inside the same call.
    ...(info?.supportsFallback ? { betas: [FALLBACK_BETA], fallbacks: 'default' as const } : {}),
  };
}
