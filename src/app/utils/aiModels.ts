/**
 * Models offered in the UI. Shared by the client (picker) and the API routes
 * (allowlist), so a request can only ever name one of these.
 */
export interface AiModel {
  id: string;
  name: string;
  description: string;
  /** Premium models are candidates for a paid tier. */
  tier: 'standard' | 'premium';
}

export const AI_MODELS: AiModel[] = [
  {
    id: 'gpt-5.6-luna',
    name: 'GPT-5.6 Luna',
    description: 'Fastest and cheapest',
    tier: 'standard',
  },
  {
    id: 'gpt-5.6-terra',
    name: 'GPT-5.6 Terra',
    description: 'Balanced quality and speed',
    tier: 'standard',
  },
  {
    id: 'gpt-5.6-sol',
    name: 'GPT-5.6 Sol',
    description: 'Better at large, detailed models',
    tier: 'premium',
  },
  {
    id: 'gpt-6-astra',
    name: 'GPT-6 Astra',
    description: 'Most capable, slowest',
    tier: 'premium',
  },
];

export const DEFAULT_AI_MODEL = 'gpt-5.6-terra';

/** Cheap model for the input safety check that runs alongside each request. */
export const SAFETY_AI_MODEL = 'gpt-5.6-luna';

export function resolveAiModel(id: unknown): string {
  return AI_MODELS.some((m) => m.id === id) ? (id as string) : DEFAULT_AI_MODEL;
}

/**
 * Extra request options for the reasoning models above. Kept separate because
 * the installed SDK's types predate `reasoning_effort`.
 */
export const FAST_REASONING = {reasoning_effort: 'low'} as object;

/**
 * For calls that use function tools, which Chat Completions only allows on
 * these models with reasoning turned off.
 */
export const NO_REASONING = {reasoning_effort: 'none'} as object;
