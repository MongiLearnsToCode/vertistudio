// Anthropic models offered in the AI screen. Ids are the exact API strings.
// Prices are USD per million tokens (input / output), for the cost readout.
export interface AnthropicModel {
  id: string;
  label: string;
  inputPerMTok: number;
  outputPerMTok: number;
  /** Accepts output_config.effort. */
  supportsEffort: boolean;
  /** Accepts server-side refusal fallbacks (`fallbacks: "default"`). */
  supportsFallback: boolean;
}

export const ANTHROPIC_MODELS: readonly AnthropicModel[] = [
  {
    id: 'claude-opus-5-5',
    label: 'Claude Opus 5.5',
    inputPerMTok: 4,
    outputPerMTok: 20,
    supportsEffort: true,
    supportsFallback: true,
  },
  {
    id: 'claude-sonnet-5-5',
    label: 'Claude Sonnet 5.5',
    inputPerMTok: 2,
    outputPerMTok: 10,
    supportsEffort: true,
    supportsFallback: true,
  },
  {
    id: 'claude-haiku-4-5',
    label: 'Claude Haiku 4.5',
    inputPerMTok: 1,
    outputPerMTok: 5,
    supportsEffort: false,
    supportsFallback: false,
  },
];

export const DEFAULT_MODEL = 'claude-opus-5-5';

/** Where the Anthropic API key lives in the secret store (main process only). */
export const ANTHROPIC_SECRET_KEY = 'apikey_anthropic';

/** How hard the model thinks. Lower is faster and cheaper. */
export type Effort = 'low' | 'medium' | 'high' | 'xhigh' | 'max';

export function findModel(id: string): AnthropicModel | undefined {
  return ANTHROPIC_MODELS.find((m) => m.id === id);
}

/** Rough USD cost of one call, or null for a model not in the list. */
export function estimateCostUsd(
  modelId: string,
  inputTokens: number,
  outputTokens: number,
): number | null {
  const model = findModel(modelId);
  if (!model) return null;
  return (inputTokens * model.inputPerMTok + outputTokens * model.outputPerMTok) / 1_000_000;
}
