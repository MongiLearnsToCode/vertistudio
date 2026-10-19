import { BrowserWindow } from 'electron';
import { logEngine } from '../../logging';
import { IPC } from '@shared/ipc/channels';
import { aiCancelRequestSchema, aiCompleteRequestSchema } from '@shared/validation/ai-schema';
import { streamClaude } from '../ai/anthropic-client';
import { toIpcError } from './error-utils';
import type {
  AiCancelRequest,
  AiCancelResponse,
  AiCompleteRequest,
  AiCompleteResponse,
  AiStreamChunkEvent,
} from '@shared/ipc/types';

// ai:complete streams a Claude reply to the renderer as ai:stream-chunk events.
// This is the pattern for any feature that needs Claude: validate the request,
// call the client in src/main/ai/, push results back, never expose the key.

const log = logEngine.createLogger('AiHandlers');

const inFlight = new Map<string, AbortController>();

export async function handleAiComplete(
  event: Electron.IpcMainInvokeEvent,
  data: AiCompleteRequest,
): Promise<AiCompleteResponse> {
  let parsed: AiCompleteRequest;
  try {
    parsed = aiCompleteRequestSchema.parse(data);
  } catch (err) {
    return { success: false, error: toIpcError(err).error };
  }

  if (inFlight.has(parsed.requestId)) {
    return { success: false, error: 'A request with this requestId is already in flight' };
  }

  const controller = new AbortController();
  inFlight.set(parsed.requestId, controller);

  const window = BrowserWindow.fromWebContents(event.sender);
  const send = (payload: AiStreamChunkEvent) => {
    if (!window || window.isDestroyed()) return;
    window.webContents.send(IPC.AI_STREAM_CHUNK, payload);
  };

  try {
    const result = await streamClaude({
      prompt: parsed.prompt,
      system: parsed.system,
      model: parsed.model,
      maxTokens: parsed.maxTokens,
      signal: controller.signal,
      onText: (delta) => send({ requestId: parsed.requestId, delta }),
    });
    send({
      requestId: parsed.requestId,
      done: true,
      usage: {
        model: result.model,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
      },
    });
    return { success: true };
  } catch (err) {
    if (controller.signal.aborted) {
      log.info('ai:complete aborted', { requestId: parsed.requestId });
      send({ requestId: parsed.requestId, done: true, error: 'Canceled' });
      return { success: false, error: 'Canceled' };
    }
    const message = err instanceof Error ? err.message : toIpcError(err).error;
    log.error('ai:complete failed', err, { requestId: parsed.requestId });
    send({ requestId: parsed.requestId, error: message, done: true });
    return { success: false, error: message };
  } finally {
    inFlight.delete(parsed.requestId);
  }
}

export async function handleAiCancel(
  _event: Electron.IpcMainInvokeEvent,
  data: AiCancelRequest,
): Promise<AiCancelResponse> {
  let parsed: AiCancelRequest;
  try {
    parsed = aiCancelRequestSchema.parse(data);
  } catch (err) {
    log.warn('Invalid ai:cancel request', { err: String(err) });
    return { success: false };
  }

  const controller = inFlight.get(parsed.requestId);
  if (!controller) return { success: false };

  controller.abort();
  return { success: true };
}
