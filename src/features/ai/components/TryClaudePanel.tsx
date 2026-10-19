import { useEffect, useRef, useState } from 'react';
import { Panel, Button } from '@shared/components';
import { estimateCostUsd } from '@shared/ai/models';
import type { AiStreamChunkEvent } from '@shared/ipc/types';

type Usage = NonNullable<AiStreamChunkEvent['usage']>;

function newRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

/** Ask Claude something and watch the answer stream in, with the tokens and cost it used. */
export function TryClaudePanel() {
  const [prompt, setPrompt] = useState('In one sentence, what is a desktop app?');
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [busy, setBusy] = useState(false);
  const requestIdRef = useRef<string | null>(null);

  useEffect(() => {
    return window.api.onAiStreamChunk((event) => {
      if (event.requestId !== requestIdRef.current) return;
      if (event.delta) setAnswer((prev) => prev + event.delta);
      if (event.error) setError(event.error);
      if (event.usage) setUsage(event.usage);
      if (event.done) setBusy(false);
    });
  }, []);

  const run = async () => {
    const requestId = newRequestId();
    requestIdRef.current = requestId;
    setAnswer('');
    setError(null);
    setUsage(null);
    setBusy(true);
    const res = await window.api.aiComplete({ requestId, prompt });
    if (!res.success && res.error) setError(res.error);
    setBusy(false);
  };

  const cancel = () => {
    if (requestIdRef.current) void window.api.aiCancel({ requestId: requestIdRef.current });
  };

  const cost = usage ? estimateCostUsd(usage.model, usage.inputTokens, usage.outputTokens) : null;

  return (
    <Panel header="Try it">
      <div className="p-3 space-y-3">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.currentTarget.value)}
          rows={3}
          className="w-full bg-app-base text-text-primary rounded-[6px] p-2 text-[12px] focus:outline-none"
          style={{ border: '0.5px solid var(--color-border-input)' }}
          aria-label="Prompt"
        />
        <div className="flex gap-2">
          <Button variant="primary" onClick={() => void run()} disabled={busy || !prompt.trim()}>
            {busy ? 'Thinking…' : 'Ask Claude'}
          </Button>
          {busy && (
            <Button variant="secondary" onClick={cancel}>
              Stop
            </Button>
          )}
        </div>
        {(answer || error) && (
          <div className="rounded bg-app-deep p-3 text-[12px] text-text-secondary whitespace-pre-wrap">
            {answer}
            {error && <p className="text-accent-red mt-2">{error}</p>}
          </div>
        )}
        {usage && (
          <p className="text-[10px] text-text-dim font-mono">
            {usage.model} · {usage.inputTokens} in / {usage.outputTokens} out
            {cost !== null && ` · about $${cost.toFixed(4)}`}
          </p>
        )}
      </div>
    </Panel>
  );
}
