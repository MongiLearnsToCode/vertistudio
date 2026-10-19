# Design tokens

> Single source of truth: [`src/renderer/styles/global.css`](../src/renderer/styles/global.css), inside the Tailwind 4 `@theme` block.

All design tokens are CSS custom properties exposed both as `var(--name)` (for inline `style={...}` and arbitrary-value Tailwind classes) and — where Tailwind 4 supports the namespace — as named utility classes. Theme variants (`[data-theme="dark"]`, `[data-theme="light"]`, `[data-theme="hc"]`, color packs) override only the tokens they need; the utility classes pick up the overridden value automatically.

## Colors

Custom brand palette, defined explicitly in `@theme`. Tailwind generates `bg-*`, `text-*`, `border-*`, `fill-*` utilities for each.

| Token | Utility example | Notes |
|---|---|---|
| `--color-app-deep` | `bg-app-deep` | Deepest surface (sidebar) |
| `--color-app-base` | `bg-app-base` | Window base |
| `--color-app-surface` | `bg-app-surface` | Card / panel |
| `--color-app-hover` | `bg-app-hover` | Hover state |
| `--color-app-active` | `bg-app-active` | Active / pressed |
| `--color-app-player` | `bg-app-player` | Footer / player bar |
| `--color-accent` | `bg-accent` | Primary brand |
| `--color-accent-light` | `text-accent-light` | Accent on dark backgrounds |
| `--color-accent-green` | `text-accent-green` | Success / positive |
| `--color-accent-amber` | `text-accent-amber` | Warning |
| `--color-accent-red` | `text-accent-red` | Error / destructive |
| `--color-border` | `border-border` | Default border |
| `--color-border-hover` | `border-border-hover` | Hovered border |
| `--color-border-input` | `border-border-input` | Form input border |
| `--color-text-primary` | `text-text-primary` | Body text |
| `--color-text-secondary` | `text-text-secondary` | Secondary text |
| `--color-text-muted` | `text-text-muted` | Muted text |
| `--color-text-dim` | `text-text-dim` | Dimmed / placeholder |

## Typography

Provided by Tailwind 4's defaults. Override in `@theme` only when the brand needs to diverge.

| Utility | Size |
|---|---|
| `text-xs` | 0.75rem (12px) |
| `text-sm` | 0.875rem (14px) |
| `text-base` | 1rem (16px) |
| `text-lg` | 1.125rem (18px) |
| `text-xl` | 1.25rem (20px) |
| `text-2xl` | 1.5rem (24px) |
| `text-3xl` | 1.875rem (30px) |

Reach for the named scale (`text-sm`) over arbitrary values (`text-[14px]`).

## Spacing

Provided by Tailwind 4's default `--spacing: 0.25rem` (4px). All `p-*`, `m-*`, `gap-*`, `space-*`, `w-*`, `h-*` utilities multiply this base by the integer suffix.

| Utility | Value |
|---|---|
| `p-1` | 4px |
| `p-2` | 8px |
| `p-3` | 12px |
| `p-4` | 16px |
| `p-6` | 24px |
| `p-8` | 32px |
| `p-12` | 48px |
| `p-16` | 64px |

The same scale applies to `m-*`, `gap-*`, `space-x-*`, `space-y-*`, `w-*`, `h-*`. Reach for the named scale over arbitrary pixels (`px-[10px]` → `px-2` or `px-3`).

## Radius

Provided by Tailwind 4's defaults.

| Utility | Value |
|---|---|
| `rounded-sm` | 0.125rem |
| `rounded-md` | 0.375rem |
| `rounded-lg` | 0.5rem |
| `rounded-xl` | 0.75rem |
| `rounded-full` | 9999px |

## Shadow

Provided by Tailwind 4's defaults.

| Utility | Description |
|---|---|
| `shadow-sm` | Subtle |
| `shadow-md` | Default elevation |
| `shadow-lg` | Raised |
| `shadow-xl` | Modals / dropdowns |

## Motion — easing

Custom curves defined in `@theme`. Tailwind 4 auto-generates `ease-*` utilities from `--ease-*`.

| Token | Utility | Value | Use for |
|---|---|---|---|
| `--ease-emphasis` | `ease-emphasis` | `cubic-bezier(0.2, 0, 0, 1)` | Element entrances, focused attention |
| `--ease-standard` | `ease-standard` | `cubic-bezier(0.4, 0, 0.2, 1)` | Default for most transitions |

Tailwind's defaults (`ease-linear`, `ease-in`, `ease-out`, `ease-in-out`) remain available.

## Motion — duration

Custom durations defined in `@theme`. Tailwind 4 does not auto-generate utilities from `--duration-*`, so the matching utility classes are declared via `@utility` blocks in `global.css`.

| Token | Utility | Value | Use for |
|---|---|---|---|
| `--duration-fast` | `duration-fast` | 120ms | Hover, focus, small reveals |
| `--duration-normal` | `duration-normal` | 220ms | Default for most transitions |
| `--duration-slow` | `duration-slow` | 360ms | Modals, drawers, page-level |

Use with a transition: `<button className="transition-colors duration-fast ease-standard">`.

## Z-index

Layering tokens for app shell elements. Defined in `@theme` and exposed as utilities via `@utility`.

| Token | Utility | Value |
|---|---|---|
| `--z-dropdown` | `z-dropdown` | 1000 |
| `--z-popover` | `z-popover` | 1100 |
| `--z-modal` | `z-modal` | 1200 |
| `--z-toast` | `z-toast` | 1300 |

Reach for the named token over numeric `z-50` / `z-[200]` so layers stay consistent across the app.

## Adding a new token

1. Add `--token-name: value;` inside the `@theme` block in [`global.css`](../src/renderer/styles/global.css).
2. If the token is in a Tailwind 4 auto-generated namespace (`--color-*`, `--text-*`, `--radius-*`, `--shadow-*`, `--ease-*`, `--font-*`, `--font-weight-*`, `--tracking-*`, `--leading-*`, `--blur-*`, `--breakpoint-*`, `--container-*`, `--spacing`, `--animate-*`), the utility class is generated automatically.
3. Otherwise (e.g. duration, z-index), add an `@utility name { property: var(--token-name); }` block alongside the existing ones.
4. Document the token here.

## When to override Tailwind defaults

Don't redefine a default just to "be explicit." Override only when the brand value differs. Every override is a maintenance line that has to track Tailwind upgrades.
