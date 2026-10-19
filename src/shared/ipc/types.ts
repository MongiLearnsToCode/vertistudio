// app:get-info
export interface AppGetInfoResponse {
  version: string;
  name: string;
  electronVersion: string;
  chromeVersion: string;
  nodeVersion: string;
  buildHash: string;
  buildDate: string;
  homepage: string | null;
  description: string | null;
}

// app:open-external
export interface AppOpenExternalRequest {
  url: string;
}

export interface AppOpenExternalResponse {
  success: boolean;
  error?: string;
}

// app:show-in-folder — Opens the OS file manager with the given file
// highlighted (`shell.showItemInFolder`). The path must already exist;
// the renderer is responsible for sourcing it from a trusted origin
// (dialog, drag-drop, or fs:list output).
export interface AppShowInFolderRequest {
  path: string;
}

export interface AppShowInFolderResponse {
  success: boolean;
  error?: string;
}

// app:open-path — Opens the path in the OS default application
// (`shell.openPath`). Works for files (open in the default editor /
// viewer) and directories (open in the file manager).
export interface AppOpenPathRequest {
  path: string;
}

export interface AppOpenPathResponse {
  success: boolean;
  error?: string;
}

// log:send (renderer → main process logging)
export interface LogSendRequest {
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  module: string;
  message: string;
  context?: Record<string, unknown>;
  error?: { name: string; message: string; stack?: string };
}

// dialog:open-file
export interface DialogOpenFileRequest {
  title?: string;
  filters?: { name: string; extensions: string[] }[];
  multiSelections?: boolean;
  /** Pick folders instead of files. Picked paths are blessed for fs:* either way. */
  directory?: boolean;
}

export interface DialogOpenFileResponse {
  filePaths: string[];
  canceled: boolean;
}

// settings:*
import type { AppSettings, AppSettingKey } from '@shared/validation/settings-schema';
export type { AppSettings, AppSettingKey };

// fs:* — split into a separate module so the surface stays scoped. Re-export
// here so the existing `@shared/ipc/types` import paths keep working.
export type {
  FsEncoding,
  FsReadRequest,
  FsReadResponse,
  FsWriteRequest,
  FsWriteResponse,
  FsListRequest,
  FsListEntry,
  FsListResponse,
  FsStatRequest,
  FsStatResponse,
} from './fs-types';

export interface SettingsGetRequest<K extends AppSettingKey = AppSettingKey> {
  key: K;
}

export interface SettingsGetResponse<K extends AppSettingKey = AppSettingKey> {
  value: AppSettings[K];
}

export interface SettingsSetRequest<K extends AppSettingKey = AppSettingKey> {
  key: K;
  value: AppSettings[K];
}

export interface SettingsSetResponse {
  success: boolean;
  error?: string;
}

export interface SettingsResetResponse {
  success: boolean;
  error?: string;
}

// settings:on-change (push, main → renderer)
export interface SettingsChangeEvent<K extends AppSettingKey = AppSettingKey> {
  key: K;
  value: AppSettings[K];
}

// theme:*
// 'slate', 'midnight', and 'hc' (high-contrast, WCAG AAA on body text)
// are explicit dark-mode variants — they don't follow the OS appearance
// toggle. 'system' resolves to 'light' or 'dark' only; users who want a
// custom dark variant pick it explicitly.
export type ThemePreference = 'system' | 'light' | 'dark' | 'slate' | 'midnight' | 'hc';
export type ResolvedTheme = 'light' | 'dark' | 'slate' | 'midnight' | 'hc';

export interface ThemeGetResponse {
  preference: ThemePreference;
  resolved: ResolvedTheme;
}

export interface ThemeSetRequest {
  preference: ThemePreference;
}

export interface ThemeSetResponse {
  success: boolean;
  error?: string;
}

// theme:on-change (push, main → renderer)
export interface ThemeChangeEvent {
  preference: ThemePreference;
  resolved: ResolvedTheme;
}

// secret:* — the renderer can store, delete and CHECK a secret, never read it.
// Raw values stay in the main process; services read them there.
export interface SecretHasRequest {
  key: string;
}

export interface SecretHasResponse {
  present: boolean;
  /** Masked form for display, e.g. "sk-a…9Xz2". Null when absent. */
  preview: string | null;
}

export interface SecretSetRequest {
  key: string;
  value: string;
}

export interface SecretSetResponse {
  success: boolean;
  error?: string;
}

export interface SecretDeleteRequest {
  key: string;
}

export interface SecretDeleteResponse {
  success: boolean;
  error?: string;
}

// secret:status — surfaces whether secret-store can encrypt at rest. False
// on Linux without gnome-keyring/kwallet (safeStorage falls back to
// plaintext UTF-8). Renderer queries this on load so the API Keys panel
// can show a persistent warning banner — otherwise the user has no way
// to know their saved keys are unprotected.
export interface SecretStatusResponse {
  encryptionAvailable: boolean;
  /** `process.platform` value at runtime. Narrowed string for cross-process
   *  type sharing (shared/ doesn't import Node types). */
  platform: 'darwin' | 'linux' | 'win32' | string;
}

// window:*
export interface WindowIsMaximizedResponse {
  isMaximized: boolean;
}

// window:on-maximize-change (push, main → renderer)
export interface WindowMaximizeChangeEvent {
  isMaximized: boolean;
}

// menu:* — actions that are emitted by the application menu and routed
// to the renderer for screen-level handling. Add new actions here when
// adding new menu items that need renderer-side behavior.
export type MenuAction = 'settings:open';

// menu:action (push, main → renderer)
export interface MenuActionEvent {
  action: MenuAction;
}

// menu:show-window-menu (request) — invoked by the renderer (hamburger
// button on Win/Linux) to popup the application menu near the button.
export interface MenuShowWindowMenuRequest {
  x?: number;
  y?: number;
}

// notification:show
export interface NotificationShowRequest {
  title: string;
  body?: string;
  silent?: boolean;
  urgency?: 'normal' | 'critical' | 'low';
}

export interface NotificationShowResponse {
  success: boolean;
  shown: boolean;
  error?: string;
}

// ai:complete (invoke). Streams chunks via the ai:stream-chunk push channel
// keyed by the same requestId. The invoke promise resolves once the stream
// has either finished (done event sent) or errored — i.e. the renderer can
// `await` for completion if it doesn't need fine-grained progress beyond
// chunk events.
export interface AiCompleteRequest {
  requestId: string;
  prompt: string;
  /** Optional system prompt. */
  system?: string;
  /** Anthropic model id; defaults to DEFAULT_MODEL in src/shared/ai/models.ts. */
  model?: string;
  maxTokens?: number;
}

export interface AiCompleteResponse {
  success: boolean;
  error?: string;
}

// ai:cancel — abort an in-flight stream by requestId
export interface AiCancelRequest {
  requestId: string;
}

export interface AiCancelResponse {
  success: boolean;
}

// ai:stream-chunk (push). Emitted multiple times per request:
//   - delta-bearing events while the model streams tokens
//   - exactly one terminal event with done=true OR error=string
export interface AiStreamChunkEvent {
  requestId: string;
  delta?: string;
  done?: boolean;
  error?: string;
  /** Present on the final successful event: which model answered and the tokens it used. */
  usage?: { model: string; inputTokens: number; outputTokens: number };
}

// dnd:resolve-paths — given absolute paths supplied by the renderer, return
// per-path metadata from a main-process fs.stat. METADATA ONLY — does not
// grant any privilege. Use `dnd:bless-and-resolve` (preload-internal) to
// bless a path that came from a real File drop event.
export interface DndResolvedPath {
  path: string;
  name: string;
  size: number;
  isFile: boolean;
  isDirectory: boolean;
  exists: boolean;
}

export interface DndResolvePathsRequest {
  paths: string[];
}

export interface DndResolvePathsResponse {
  success: boolean;
  paths: DndResolvedPath[];
  error?: string;
}

// dnd:bless-and-resolve — preload-internal channel. The preload bridge calls
// this from `dndGetPathForFile` AFTER resolving a real File via
// webUtils.getPathForFile (which only returns a path for File objects that
// originated in a real drop or input element — the renderer cannot synthesize
// a File pointing at an arbitrary path). The handler blesses the path so
// subsequent fs:* ops succeed, then returns metadata.
//
// Not exposed in the renderer's `window.api` — buyer code reaches it
// implicitly through useFileDrop / dndGetPathForFile.
export interface DndBlessAndResolveRequest {
  path: string;
}

export interface DndBlessAndResolveResponse {
  success: boolean;
  resolved: DndResolvedPath;
  error?: string;
}

export type {
  VideoInfo,
  VideoExportRequest,
  VideoEvent,
  VideoResult,
  VideoBootstrap,
} from '@shared/video/types';

export type { ProjectSaveRequest, ProjectSummary, OpenProject } from './project-types';

export interface VideoCheckOutputRequest {
  path: string;
}

export type { UpdateState, UpdateResponse } from './update-types';
