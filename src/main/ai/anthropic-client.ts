import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import type { z } from 'zod';
import { logEngine } from '../../logging';
import { secretStore } from '../services/secret-store';
import { settingsStore } from '../services/settings-store';
import { ANTHROPIC_SECRET_KEY } from '@shared/ai/models';
import { buildRequestParams, type ClaudeRequestOptions } from './request-params';

// The one place the app talks to Claude. Main process only: the API key is read
// from the OS-encrypted secret store here and never crosses into the renderer.
//
//   askClaude({ prompt })                 -> the full text
//   streamClaude({ prompt, onText })      -> text as it arrives
//   askClaudeJson({ prompt, schema })     -> an object validated against a zod schema
//
// Feature services in the main process call these directly. The renderer reaches
// Claude only through an IPC channel a service exposes (ai-handlers.ts is the pattern).

const log = logEngine.createLogger('Claude');

export class MissingApiKeyError extends Error {
  constructor() {
    super('No Anthropic API key saved. Add one in the AI screen.');
    this.name = 'MissingApiKeyError';
  }
}

export class ClaudeRefusalError extends Error {
  constructor(category: string | null) {
    super(`Claude declined this request${category ? ` (${category})` : ''}.`);
    this.name = 'ClaudeRefusalError';
  }
}

export interface ClaudeUsage {
  model: string;
  inputTokens: number;
  outputTokens: number;
}

export interface ClaudeTextResult extends ClaudeUsage {
  text: string;
}

export interface ClaudeCallOptions extends ClaudeRequestOptions {
  signal?: AbortSignal;
}

type FinalMessage = Anthropic.Beta.Messages.BetaMessage;

function getClient(): Anthropic {
  const apiKey = secretStore.get(ANTHROPIC_SECRET_KEY);
  if (!apiKey) throw new MissingApiKeyError();
  return new Anthropic({ apiKey });
}

function params(options: ClaudeRequestOptions) {
  return buildRequestParams(options, settingsStore.get('aiModel'));
}

function assertNotRefused(message: FinalMessage): void {
  if (message.stop_reason === 'refusal') {
    throw new ClaudeRefusalError(message.stop_details?.category ?? null);
  }
}

function usageOf(message: FinalMessage): ClaudeUsage {
  return {
    model: message.model,
    inputTokens: message.usage.input_tokens,
    outputTokens: message.usage.output_tokens,
  };
}

function textOf(message: FinalMessage): string {
  return message.content
    .filter((b): b is Anthropic.Beta.Messages.BetaTextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('');
}

/** Streams the reply, calling `onText` with each new piece. Resolves with the full text. */
export async function streamClaude(
  options: ClaudeCallOptions & { onText?: (delta: string) => void },
): Promise<ClaudeTextResult> {
  const client = getClient();
  const stream = client.beta.messages.stream(params(options), { signal: options.signal });
  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      options.onText?.(event.delta.text);
    }
  }
  const message = await stream.finalMessage();
  assertNotRefused(message);
  log.info('Claude call finished', { ...usageOf(message), stop: message.stop_reason });
  return { text: textOf(message), ...usageOf(message) };
}

/** One question, one full answer. Streams under the hood so long replies never time out. */
export async function askClaude(options: ClaudeCallOptions): Promise<ClaudeTextResult> {
  return streamClaude(options);
}

/**
 * Asks Claude for JSON that matches `schema` and returns it parsed and validated.
 * Use this whenever code, not a person, reads the answer.
 */
export async function askClaudeJson<S extends z.ZodType>(
  options: ClaudeCallOptions & { schema: S },
): Promise<{ data: z.infer<S> } & ClaudeUsage> {
  const client = getClient();
  const base = params(options);
  const message = await client.beta.messages.parse(
    {
      ...base,
      output_config: { ...base.output_config, format: betaZodOutputFormat(options.schema) },
    },
    { signal: options.signal },
  );
  assertNotRefused(message);
  if (message.parsed_output == null) {
    throw new Error('Claude returned JSON that does not match the schema.');
  }
  log.info('Claude JSON call finished', { ...usageOf(message), stop: message.stop_reason });
  return { data: message.parsed_output as z.infer<S>, ...usageOf(message) };
}
