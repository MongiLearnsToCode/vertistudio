import { ApiKeysPanel } from './ApiKeysPanel';
import { TryClaudePanel } from './TryClaudePanel';

export function AiScreen() {
  return (
    <div className="flex flex-col h-full">
      <div
        className="flex items-center h-[40px] px-3 bg-app-surface shrink-0"
        style={{ borderBottom: '0.5px solid var(--color-border)' }}
      >
        <span className="text-[13px] font-medium text-text-secondary">AI</span>
      </div>
      <div className="flex-1 overflow-auto p-4">
        <div className="max-w-[640px] space-y-4">
          <ApiKeysPanel />
          <TryClaudePanel />
        </div>
      </div>
    </div>
  );
}
