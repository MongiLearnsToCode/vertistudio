import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Panel, Button, Badge, Select, TextInput } from '@shared/components';
import { Icon } from '@renderer/components/Icon';
import { useApiKey } from '@renderer/hooks/useApiKey';
import { useSecretStatus } from '@renderer/hooks/useSecretStatus';
import { useSetting } from '@renderer/hooks/useSetting';
import { useToast } from '@renderer/contexts/ToastContext';
import { ANTHROPIC_MODELS } from '@shared/ai/models';

const KEYS_URL = 'https://console.anthropic.com/settings/keys';

export function ApiKeysPanel() {
  const secretStatus = useSecretStatus();
  const { state, save, remove } = useApiKey('anthropic');
  const [model, setModel] = useSetting('aiModel');
  const { showToast } = useToast();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // safeStorage has no backend on some Linux desktops (no gnome-keyring/kwallet).
  const showNoEncryptionBanner = secretStatus !== null && !secretStatus.encryptionAvailable;

  const reset = () => {
    setEditing(false);
    setValue('');
  };

  const handleSave = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await save(value);
      if (!res.success) {
        showToast(`Could not save the key: ${res.error ?? 'unknown error'}`, 'error');
        return;
      }
      showToast('Anthropic key saved', 'success');
      reset();
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async () => {
    const res = await remove();
    showToast(
      res.success ? 'Anthropic key removed' : `Could not remove the key: ${res.error ?? 'unknown'}`,
      res.success ? 'success' : 'error',
    );
  };

  const showInput = state.kind === 'absent' || editing;
  const showStored = state.kind === 'present' && !editing;

  return (
    <Panel header="Claude">
      <div className="p-3 space-y-4">
        {showNoEncryptionBanner && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded p-3"
            style={{
              border: '1px solid var(--color-warning, #b45309)',
              background: 'color-mix(in srgb, var(--color-warning, #b45309) 12%, transparent)',
            }}
          >
            <Icon icon={AlertTriangle} size={16} className="text-warning shrink-0 mt-[2px]" />
            <p className="text-[11px] text-text-secondary">
              This system has no keyring, so the key is stored without OS encryption.
            </p>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-text-secondary font-medium">Anthropic API key</span>
              {state.kind === 'present' && <Badge variant="free">Saved</Badge>}
              {state.kind === 'absent' && <Badge variant="pro">Not set</Badge>}
            </div>
            <button
              onClick={() => void window.api.appOpenExternal({ url: KEYS_URL })}
              className="text-[10px] text-accent-light hover:underline cursor-pointer"
            >
              Get a key
            </button>
          </div>

          {state.kind === 'loading' && <p className="text-[11px] text-text-dim">Loading…</p>}

          {showStored && (
            <div className="flex items-center gap-2">
              <code className="flex-1 text-[11px] font-mono text-text-muted px-2 py-1 bg-app-deep rounded">
                {state.preview}
              </code>
              <Button variant="secondary" onClick={() => setEditing(true)}>
                Replace
              </Button>
              <Button variant="secondary" onClick={() => void handleRemove()}>
                Remove
              </Button>
            </div>
          )}

          {showInput && (
            <div className="flex items-center gap-2">
              <TextInput
                type="password"
                value={value}
                onChange={(e) => setValue(e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !submitting && value.trim()) void handleSave();
                  if (e.key === 'Escape' && editing) reset();
                }}
                placeholder="sk-ant-..."
                disabled={submitting}
                className="flex-1"
                autoComplete="off"
                spellCheck={false}
                aria-label="Anthropic API key"
              />
              <Button
                variant="primary"
                onClick={() => void handleSave()}
                disabled={submitting || !value.trim()}
              >
                {submitting ? 'Saving…' : 'Save'}
              </Button>
              {editing && (
                <Button variant="secondary" onClick={reset} disabled={submitting}>
                  Cancel
                </Button>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-[12px] text-text-secondary font-medium">Model</span>
          <Select
            value={model}
            onValueChange={(next) => void setModel(next)}
            options={ANTHROPIC_MODELS.map((m) => ({
              value: m.id,
              label: `${m.label} · $${m.inputPerMTok} / $${m.outputPerMTok} per M tokens`,
            }))}
            aria-label="Model"
            className="w-[300px]"
          />
        </div>

        <p className="text-[10px] text-text-dim">
          The key is encrypted by your OS and stays in the main process. This screen only ever sees
          the masked version.
        </p>
      </div>
    </Panel>
  );
}
