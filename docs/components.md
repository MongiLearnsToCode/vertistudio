# Shared components

Quick reference for everything in `src/shared/components/`. Import via
the index:

```tsx
import { Button, Panel, Modal, useConfirm } from '@shared/components';
```

The Components Gallery screen renders live demos for each of these.
Reach for it before writing a one-off — `npm run dev` → sidebar →
Components.

## Inputs

| Component       | Use it for                                                                  | Props of note                       |
| --------------- | --------------------------------------------------------------------------- | ----------------------------------- |
| **Button**      | Action button. Variants: `primary`, `secondary`. Sizes: `sm`, `md`.          | `variant` (required), `size`        |
| **IconButton**  | Icon-only button. Always pass `aria-label`.                                  | `icon` (a node, e.g. `<Icon icon={X} />`), `label` |
| **TextInput**   | Single-line text input.                                                     | `size`, `aria-invalid`              |
| **SearchInput** | TextInput with a search icon and clear button.                              | `onClear`                           |
| **Switch**      | On/off toggle.                                                              | `checked`, `onCheckedChange`        |
| **Checkbox**    | Tri-state checkbox (uses Radix).                                            | `checked`, `onCheckedChange`        |
| **Select**      | Dropdown select (uses Radix).                                               | `value`, `onValueChange`, `options` |

## Layout & containers

| Component       | Use it for                                                                       |
| --------------- | -------------------------------------------------------------------------------- |
| **Panel**       | Bordered card with optional header. The default container for settings sections. |
| **Card**        | Looser container — for groups that aren't a settings section.                    |
| **Modal**       | Centered focus-trapped dialog (uses Radix Dialog).                               |
| **Tabs**        | Top-level tab navigation (uses Radix Tabs).                                      |
| **Tooltip**     | Hover/focus tooltip (uses Radix Tooltip). Auto-dismisses on Escape.              |

### Layout primitives (`@shared/components` re-exports them too)

| Component                           | Use it for                                                                                |
| ----------------------------------- | ----------------------------------------------------------------------------------------- |
| **Stack** / **HStack** / **VStack** | Flex containers with `gap` prop. The default layout primitive.                            |
| **Grid**                            | CSS grid wrapper with column counts via prop.                                             |
| **Spacer**                          | Flex 1 filler. Use sparingly — usually `Stack` with `justify="space-between"` is clearer. |
| **Divider**                         | 1px border line. Honors theme tokens.                                                     |
| **Container**                       | Max-width wrapper for screen content.                                                     |
| **PageHeader**                      | Title + optional subtitle + actions row.                                                  |

## Status & feedback

| Component         | Use it for                                                          |
| ----------------- | ------------------------------------------------------------------- |
| **Toast**         | Transient notification. Use via `useToast()` from `ToastContext`.   |
| **ConfirmDialog** | Promise-based confirm. Use via `useConfirm()` from `DialogContext`. |
| **EmptyState**    | "No items yet": `icon`, `title`, `description`, `action`.           |
| **LoadingState**  | Centered spinner with optional message.                             |
| **Skeleton**      | Pulse-loading placeholder for content shape.                        |
| **ProgressBar**   | Linear progress, `value` 0-100. `color`: purple, green, amber, red. |
| **Badge**         | Small status pill. Variants: `free` (green), `pro` (accent).        |

## Data

| Component      | Use it for                                                                       |
| -------------- | -------------------------------------------------------------------------------- |
| **Table**      | Sortable, paginated table (TanStack Table). Props: `data`, `columns`, `pageSize`. |
| **Pagination** | Page controls. Table uses it; use it alone for long custom lists.                |

## Motion

| What                                | Use it for                                                                 |
| ----------------------------------- | -------------------------------------------------------------------------- |
| **FadeIn** / **SlideIn** / **ScaleIn** | Simple enter animations on mount. Honor `prefers-reduced-motion`.       |
| `motion` (`motion/react`)           | Anything richer: `layout` animation, `AnimatePresence`, drag, stagger.     |

## Hooks (not components, but living adjacent)

These are exposed via `src/renderer/contexts/` and `src/renderer/hooks/`:

| Hook                        | Purpose                                                        |
| --------------------------- | -------------------------------------------------------------- |
| `useToast()`                | Push transient notifications.                                  |
| `useConfirm()`              | Promise-based confirm dialog.                                  |
| `useTheme()`                | Read/write theme preference (`'system' \| 'light' \| 'dark'`). |
| `useSetting('key')`         | Get/set a typed setting persisted to `settings.json`.          |
| `useLogger('Module')`       | Renderer-side logger that flows to `{userData}/logs/`.         |
| `useApiKey('anthropic')`    | Save/remove/check an API key. Sees only a masked preview.      |
| `useShortcut({ id, accelerator }, fn)` | Keyboard shortcut while the window is focused.      |
| `useFileDrop({ onDrop })`   | Wire a drop zone with main-process path resolution.            |

## Conventions

- **Lucide icons only.** Don't add inline `<svg>`. Use `<Icon icon={X} />`
  to inherit the wrapper's default size.
- **`aria-label` is required** on icon-only interactive elements
  (pass `aria-label` and `label` to `IconButton`).
- **Theme tokens** drive colors — `text-text-primary`, `bg-app-surface`,
  `border-border`. Don't hardcode hex.
- **Reach for primitives before raw Tailwind.** If you find yourself
  writing `flex items-center gap-3`, use `<HStack gap={3}>`.

## See also

- [docs/design-tokens.md](./design-tokens.md) — color/space/radius/etc.
  tokens that drive these components.
- [src/shared/components/index.ts](../src/shared/components/index.ts)
  — single export surface (use this to discover what's available).
