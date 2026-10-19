import { motion } from 'motion/react';
import {
  Bell,
  Blocks,
  Bot,
  FileCode2,
  FolderOpen,
  KeyRound,
  Package,
  Palette,
  ShieldCheck,
  Sparkles,
  Wand2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@shared/components';
import { Icon } from '@renderer/components/Icon';
import { useToast } from '@renderer/contexts/ToastContext';
import { useConfirm } from '@renderer/contexts/DialogContext';
import { useAppInfo } from '@renderer/hooks/useAppInfo';

// The building blocks this starter already has wired, so Claude Code places them
// instead of inventing them.
const BLOCKS: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: ShieldCheck,
    title: 'A safe bridge',
    body: 'Main, preload and UI are split. Every message between them is typed and checked with Zod.',
  },
  {
    icon: Sparkles,
    title: 'Claude, ready to call',
    body: 'askClaude, streamClaude and askClaudeJson in the main process. Your key never reaches the UI.',
  },
  {
    icon: FolderOpen,
    title: 'Your files',
    body: 'Native file and folder pickers, drag and drop, and a file service that only touches what the user chose.',
  },
  {
    icon: KeyRound,
    title: 'Settings and secrets',
    body: 'Typed settings that persist, and secrets encrypted by the OS.',
  },
  {
    icon: Blocks,
    title: '21 components',
    body: 'Buttons, inputs, tables, dialogs, toasts, tabs, tooltips, layout. Open the Components screen.',
  },
  {
    icon: Wand2,
    title: 'Motion',
    body: 'The motion library for layout animation, plus FadeIn, SlideIn and ScaleIn.',
  },
  {
    icon: Palette,
    title: 'Themes',
    body: 'Light, dark, slate, midnight and high contrast. Follows the OS by default.',
  },
  {
    icon: FileCode2,
    title: 'Generators',
    body: 'npm run new:feature and npm run new:ipc write the wiring in every place it goes.',
  },
  {
    icon: Bot,
    title: 'CLAUDE.md',
    body: 'The rules Claude Code reads before it writes anything, so every screen is built the same way.',
  },
  {
    icon: Package,
    title: 'Installers',
    body: 'npm run build:win, build:mac or build:linux makes a file you can send to anyone.',
  },
];

export function HomeScreen() {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const info = useAppInfo();

  const tryNotification = async () => {
    const res = await window.api.notificationShow({
      title: info?.name ?? 'App',
      body: 'A native notification from your app.',
    });
    if (!res.success) showToast(`Notification failed: ${res.error ?? 'unknown'}`, 'error');
    else if (!res.shown) showToast('Notifications are not supported here', 'info');
  };

  const tryConfirm = async () => {
    const ok = await confirm({
      title: 'Delete this item?',
      message: 'This is the built-in confirm dialog. Nothing is deleted.',
      confirmLabel: 'Delete',
      intent: 'danger',
    });
    showToast(ok ? 'Confirmed' : 'Cancelled', ok ? 'success' : 'info');
  };

  return (
    <div className="flex flex-col h-full">
      <div
        className="flex items-center h-[40px] px-3 bg-app-surface shrink-0"
        style={{ borderBottom: '0.5px solid var(--color-border)' }}
      >
        <span className="text-[13px] font-medium text-text-secondary">Home</span>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div className="max-w-[860px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="mb-5"
          >
            <h1 className="text-[22px] font-semibold text-accent-light mb-1">
              {info?.name ?? 'Desktop App Starter'}
            </h1>
            <p className="text-[12px] text-text-muted max-w-[620px]">
              A desktop app that already runs. Open this folder in Claude Code and ask for a screen:
              it reads CLAUDE.md, reuses the blocks below, and adds your feature the same way every
              time.
            </p>
          </motion.div>

          <div className="flex flex-wrap gap-2 mb-6">
            <Button variant="primary" onClick={() => showToast('Toasts are wired', 'success')}>
              Try a toast
            </Button>
            <Button variant="secondary" onClick={() => void tryNotification()}>
              <span className="inline-flex items-center gap-1">
                <Icon icon={Bell} size={12} /> Try a notification
              </span>
            </Button>
            <Button variant="secondary" onClick={() => void tryConfirm()}>
              Try a confirm dialog
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {BLOCKS.map((block, i) => (
              <motion.div
                key={block.title}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.05 * i }}
                className="flex gap-3 p-3 rounded-md bg-app-surface"
                style={{ border: '0.5px solid var(--color-border)' }}
              >
                <Icon icon={block.icon} size={18} className="text-accent-light shrink-0 mt-[1px]" />
                <div>
                  <div className="text-[12px] font-medium text-text-primary">{block.title}</div>
                  <div className="text-[11px] text-text-muted mt-0.5 leading-relaxed">
                    {block.body}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
