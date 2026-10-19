# CLAUDE.md — Instructions for Claude Code

> **Read this file before writing any code.** It says where every kind of code goes in this repo.
> **These rules override generic best practices.** When this file conflicts with a habit, follow this file.

## Project context

A desktop app starter: **Electron 41, React 19, TypeScript 5.9 (strict), Tailwind CSS 4, electron-vite 5.**
It already runs. The person using it asks you for features in plain words; you add them the way the
rest of the app is built, reusing what is already here.

Targets: Windows (NSIS), macOS (DMG), Linux (AppImage + deb). All code must work on all three.

Every decision favors **predictability**: the same request should produce the same structure every time.

---

## Quick file orientation

| When you need to…                       | Look here / put it here                                                                                  |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Add a new screen                        | `npm run new:feature MyScreen`, or `src/features/{name}/` + one entry in `src/renderer/screens-registry.ts` |
| Add a new IPC channel                   | `npm run new:ipc domain:action`, or the 5 steps below                                                     |
| Call Claude (AI)                        | `askClaude` / `streamClaude` / `askClaudeJson` from `src/main/ai/anthropic-client.ts` (main process only) |
| Let the user pick a file or folder      | `window.api.dialogOpenFile({ directory?, multiSelections?, filters? })` (picked paths become readable)    |
| Accept files or folders by drag-and-drop | `useFileDrop()` from `src/renderer/hooks/useFileDrop.ts`                                                |
| Read / write / list files               | `src/main/services/fs-service.ts` (allow-listed) via the `fs:*` channels                                  |
| Open a file or reveal it in the OS      | `window.api.appOpenPath` / `window.api.appShowInFolder`                                                   |
| Add a main-process service              | `src/main/services/{name}.ts`, init in `src/main/index.ts` if it holds state                             |
| Add a setting                           | Extend the schema in `src/shared/validation/settings-schema.ts`                                         |
| Read/write a setting                    | `useSetting('key')` (renderer) or `settingsStore.get/set` (main)                                         |
| Store a secret (API key)                | `src/main/services/secret-store.ts`; renderer uses `useApiKey(name)` (never sees the raw value)          |
| Log                                     | main: `logEngine.createLogger('Name')` · renderer: `useLogger('Name')`                                   |
| Show a toast                            | `useToast()` from `src/renderer/contexts/ToastContext.tsx`                                               |
| Ask the user to confirm                 | `useConfirm()` from `src/renderer/contexts/DialogContext.tsx`                                            |
| Show a native OS notification           | `window.api.notificationShow({ title, body })`                                                           |
| Validate IPC payloads                   | Zod schemas in `src/shared/validation/`                                                                  |
| Animate                                 | `motion` (`import { motion, AnimatePresence } from 'motion/react'`) or `FadeIn`/`SlideIn`/`ScaleIn`      |
| Use a UI component                      | `src/shared/components/` (index.ts). See them live on the **Components** screen                          |
| Add an icon                             | `lucide-react` through `src/renderer/components/Icon.tsx` (never inline SVG)                             |
| Keyboard shortcut in the window         | `useShortcut({ id, accelerator: 'CmdOrCtrl+K' }, handler)`                                               |
| Build a form with validation            | `react-hook-form` + a Zod schema (see `src/features/settings/components/SettingsForm.tsx`)              |

---

## Architecture rules (HARD — never break)

1. **Process boundary is sacred.** Renderer code (`src/renderer/`, `src/features/`) MUST NEVER `require('electron')` or use Node APIs (`fs`, `path`, `child_process`, `os`). All Node work goes through typed IPC channels.
2. **Preload exposes only specific functions** via `contextBridge`. One named function per IPC channel.
3. **Feature modules are isolated.** `src/features/a/` MUST NEVER import from `src/features/b/`. Shared code goes in `src/shared/`.
4. **Services hold business logic.** Components → hooks → IPC → handler → service. Components contain no business logic, file I/O, or network calls.
5. **One file, one concern, ~400 lines max.** Split when it grows past that.
6. **Types live next to usage.** Feature types in `src/features/{x}/types.ts`. Cross-process IPC types in `src/shared/ipc/types.ts`.

### Dependency direction (NEVER violate)

```
src/main/      ──┐
src/preload/   ──┼─→  src/shared/   (depends on nothing in this project)
src/renderer/  ──┤
src/features/  ──┘
```

- `features/` may also use `renderer/contexts/` and `renderer/hooks/`.
- `main/` and `renderer/` never import from each other. They talk over IPC.

---

## Folder structure

```
src/
  main/                  # Electron main process (Node.js)
    index.ts             # Entry: window, services init, IPC registration
    ai/                  # anthropic-client.ts (askClaude, streamClaude, askClaudeJson) + request-params.ts
    ipc/                 # One *-handlers.ts per domain + register.ts
    services/            # settings-store, secret-store, fs-service, notifier, theme-service, window-state
    menu/                # App menu
    security/            # CSP, permissions, navigation guards
    reliability/         # Crash handler
  preload/preload.ts     # contextBridge: the only door between UI and Node
  logging/               # Logging engine (file + console, optional Sentry)
  renderer/
    App.tsx              # Shell + providers + screen routing
    screens-registry.ts  # Every screen: id, label, icon, component (Sidebar + routing read it)
    components/          # Shell: Sidebar, TitleBar, StatusBar, ErrorBoundary, Icon
    contexts/            # Toast, Dialog (confirm), Theme
    hooks/               # useApiKey, useFileDrop, useLogger, useSetting, useShortcut, useAppInfo, ...
    styles/global.css    # Tailwind 4 + design tokens (@theme)
    types/electron.d.ts  # The typed window.api surface
  features/              # One folder per screen: components/, hooks/, types.ts
  shared/
    ai/models.ts         # Anthropic model list, prices, DEFAULT_MODEL
    ipc/channels.ts      # Every IPC channel name
    ipc/types.ts         # Request/response types per channel
    components/          # UI components + layout/ + motion/
    validation/          # Zod schemas
```

---

## Design patterns (use these; don't invent new ones for the same problem)

### Service (main process)

```ts
// src/main/services/example-service.ts
import { logEngine } from '../../logging';
const log = logEngine.createLogger('ExampleService');

class ExampleService {
  async doWork(input: string): Promise<Result> { ... }
}
export const exampleService = new ExampleService();
```

Pure logic (no Electron imports) goes in its own file so it can be unit-tested.

### IPC handler (canonical shape)

```ts
// src/main/ipc/example-handlers.ts
export async function handleExampleDo(
  _event: Electron.IpcMainInvokeEvent,
  data: ExampleDoRequest,
): Promise<ExampleDoResponse> {
  try {
    const parsed = exampleDoRequestSchema.parse(data);      // 1. validate (cross-process = untrusted)
    const result = await exampleService.doWork(parsed.input); // 2. delegate to a service
    return { success: true, result };                        // 3. typed response
  } catch (err) {
    log.error('handleExampleDo failed', err, { data });       // 4. log with context
    return { success: false, error: String(err) };           // 5. never throw across IPC
  }
}
```

### Hook-as-controller (renderer)

Components never call `window.api.*` directly; a hook does, and the component renders its state.

```ts
export function useExample() {
  const [state, setState] = useState<AsyncState<Result>>({ kind: 'idle' });
  const run = useCallback(async (input: string) => {
    setState({ kind: 'loading' });
    const res = await window.api.exampleDo({ input });
    setState(res.success ? { kind: 'data', value: res.result } : { kind: 'error', error: res.error ?? 'Failed' });
  }, []);
  return { state, run };
}

type AsyncState<T> =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'data'; value: T }
  | { kind: 'error'; error: string };
```

### Push events (main → renderer)

For progress or streaming: `webContents.send(IPC.SOMETHING, payload)` in main, a matching
`onSomething(callback)` in preload that returns an unsubscribe function, and a hook that subscribes.
`ai:stream-chunk` is the worked example.

### AI calls (Claude)

The API key is stored by the user on the **AI** screen, encrypted by the OS. Only the main process reads it.

```ts
// in a main-process service
import { askClaude, askClaudeJson } from '../ai/anthropic-client';

const { text } = await askClaude({ prompt, system: 'You are...' });

const Summary = z.object({ title: z.string(), tags: z.array(z.string()) });
const { data, inputTokens, outputTokens } = await askClaudeJson({ prompt, schema: Summary });
```

- Use `askClaudeJson` whenever code reads the answer. It returns data already validated by the schema.
- The model comes from the `aiModel` setting unless the call passes `model`. Don't hardcode model ids; they live in `src/shared/ai/models.ts`.
- Errors to handle: `MissingApiKeyError` (tell the user to add a key on the AI screen) and `ClaudeRefusalError`.
- The renderer never imports the SDK and never sees the key. Expose a feature-specific IPC channel from a service instead (`src/main/ipc/ai-handlers.ts` shows streaming).

### Files and folders

`fs-service` only touches paths the user chose (native dialog or drag-and-drop) or `userData`.
Picking or dropping a folder allows everything inside it. Never widen this allow-list to make a feature
work; ask the user to pick the folder. New file operations (move, rename, delete) belong in a
main-process service that re-checks `fsService.isAllowed()` for every source and destination path.

### Settings

`useSetting('key')` (renderer) or `settingsStore.get('key')` (main). Never `localStorage` for user-visible state.

### UI

- Use the components in `src/shared/components/` first. Check the Components screen before writing a new one.
- Layout primitives: `Stack`, `HStack`, `VStack`, `Grid`, `Spacer`, `Divider`, `Container`, `PageHeader`.
- Screens follow the existing shape: a 40px toolbar with the title, then a scrolling content area (copy `src/features/explorer/`).
- Colors and spacing come from the design tokens in `global.css` (`bg-app-surface`, `text-text-muted`, `text-accent-light`, ...). Never hardcode hex colors in components.
- Animation: `motion` for layout and list animation (`layout`, `AnimatePresence`), the `motion/` primitives for simple enters. Respect `prefers-reduced-motion` (`useReducedMotion()` from `motion/react`).
- Icons: `lucide-react` via `Icon`. Never inline `<svg>`.

---

## IPC channel pattern (the 5 places)

Every IPC channel is wired in **exactly these places**. `npm run new:ipc domain:action` scaffolds all of them.

1. Channel constant: `src/shared/ipc/channels.ts`
2. Request/response types: `src/shared/ipc/types.ts` (+ a Zod schema in `src/shared/validation/`)
3. Handler: `src/main/ipc/{domain}-handlers.ts`, registered in `src/main/ipc/register.ts`
4. Preload exposure: `src/preload/preload.ts`
5. Renderer declaration: `src/renderer/types/electron.d.ts`

Names are `domain:action`, lowercase (`files:scan`, not `scanFiles`).
`ipcMain.handle` / `ipcRenderer.invoke` for request/response; `webContents.send` for push.

---

## Code style rules

- TypeScript strict + `noUncheckedIndexedAccess`. **Never `any`**: use `unknown` and narrow.
- Functional React components. Named exports (no `export default`).
- `async/await`, never raw `.then()` chains.
- Path aliases: `@main/`, `@renderer/`, `@features/`, `@shared/`. No deep relative imports (`../../../`).
- Comments only when the WHY is not obvious.
- Files: components `PascalCase.tsx`, hooks `useCamelCase.ts`, everything else `kebab-case.ts`, handlers `*-handlers.ts`, schemas `*-schema.ts`, tests in `__tests__/*.test.ts`.

---

## Security rules (HARD — never relax)

1. `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`. Never change.
2. CSP stays on. Never relax it to make a feature work. Network calls belong in main, not the renderer.
3. Validate every IPC payload with Zod at the handler.
4. File access stays inside the allow-list (see Files and folders).
5. Secrets live in `secret-store` only. Never in settings, env files, logs, or the renderer.
6. External URLs open with `shell.openExternal` (`window.api.appOpenExternal`), never inside the window.
7. Never log secrets, API keys, or file contents.

---

## Cross-platform checklist (before writing code that touches the OS)

1. Paths: `path.join()`, never literal `/` or `\`. OS folders via `app.getPath('downloads' | 'documents' | 'home' | 'userData')`.
2. Keyboard: `CmdOrCtrl` in accelerators.
3. Reading text files: handle `\r\n` and a UTF-8 BOM.
4. Subprocesses: avoid. If unavoidable, absolute path, args array, `shell: false`.
5. Platform-only APIs get a `process.platform` guard and a fallback.

If you cannot test on an OS, say so. Don't claim it works there.

---

## Error handling

- Services throw. IPC handlers catch and return `{ success: false, error }`.
- `ErrorBoundary` is the renderer's safety net; don't wrap components in try/catch "just in case".
- Always log caught errors with context: `log.error('what failed', err, { ids, counts })`.
- Show the user a real message (toast or inline), never a silent failure.

---

## Testing

- Unit-test services, schemas, and pure functions with Vitest in `__tests__/` next to them.
- Keep logic that needs testing out of files that import `electron`, so tests don't need mocks.
- Every new feature gets at least one test of its core logic.
- Before saying a feature is done: `npm run typecheck`, `npm run lint`, `npm run test`. A clean typecheck alone is not proof it works.

---

## Not in this starter

There is no database, sign-in, auto-update, license keys, tray, i18n, command palette, or background
job runner here. If a request needs one, tell the user and propose the smallest addition that fits the
patterns above. Don't build a whole subsystem silently.

---

## Common AI mistakes to avoid

1. **Re-implementing what exists.** Check `src/shared/components/`, `src/renderer/hooks/`, `src/main/services/` and `src/main/ai/` first.
2. **Calling `window.api` from a component.** Go through a hook.
3. **Putting file, network, or AI calls in the renderer.** They belong in a main-process service.
4. **Hand-writing CSS or a new styling system.** Use Tailwind classes with the existing tokens and the shared components.
5. **Rewriting the app shell** (`App.tsx`, `Sidebar.tsx`) to add a screen. Add one entry to `screens-registry.ts`.
6. **Short-circuiting the IPC 5 places.** All five, every time.
7. **Over-abstracting after one example.** Extract to `shared/` on the third use.
8. **Generic catch-all error handling** (`catch (e) { console.log(e) }`).
9. **Inventing config options nobody asked for.**
10. **TODO comments.** Finish it or say what is left.
11. **Using `any`** to quiet TypeScript.
12. **Hardcoding a model id.** Use the setting or `src/shared/ai/models.ts`.
13. **Widening the file allow-list** instead of asking the user to pick a folder.
14. **Claiming work is done before running it.** Typecheck, lint, test, then say what you verified.
15. **Modifying this file without being asked.**

---

## Commands

```bash
npm run setup          # once after clone: copies .env.example, makes a placeholder icon
npm run dev            # start the app with hot reload
npm run typecheck      # tsc on main + renderer
npm run lint           # ESLint
npm run test           # Vitest
npm run new:feature    # scaffold a screen (registered in the Sidebar)
npm run new:ipc        # scaffold an IPC channel in all 5 places
npm run rebrand -- --name "My App" --id com.me.myapp
npm run build:win      # Windows installer (also build:mac, build:linux, build:unpack)
```

`scripts/dev.js` clears `ELECTRON_RUN_AS_NODE` (needed when launched from a VS Code terminal).

---

## When in doubt

1. Re-read this file.
2. Find the closest existing example in the same domain and copy its shape.
3. Ask the user rather than invent a new pattern.
