---
name: style-achiever-and-maintainer
description: "Achieve and maintain visually near-identical design to a style target. Use when: fixing UI inconsistencies, dark-theme drift (bg-white leaking into dark UI), wrong border-radius, wrong button colors (white or pink buttons), overlapping sidebars, light-themed components, color inconsistencies, Tailwind v4 deprecated classes, any style polish pass. Produces: a codebase whose UI is clean, cohesive, and pixel-close to the defined design system. Covers: color tokens, rounding scale, button variants, typography, spacing, sidebar layout, and component-level dark-theme consistency."
argument-hint: "Describe the style target or paste a reference screenshot/component"
---

# Style Achiever & Maintainer

## Design System Source of Truth

**Tokens defined in** `apps/web/src/styles/globals.css` (`@theme` block):

### Color Palette
| Token | Hex / Value | Use |
|---|---|---|
| `linear-bg` | `#05070b` | Page background |
| `linear-surface` | `#0b1016` | Panels, sidebars, card backgrounds |
| `linear-elevated` | `#111820` | Modals, popovers, dropdowns |
| `linear-border` | `#1e2a38` | All borders (default) |
| `linear-border-hover` | `#2a3f55` | Hover-state borders |
| `linear-text` | `#eef1f6` | Primary text |
| `linear-text-secondary` | `#7f8fa4` | Secondary / helper text |
| `linear-text-tertiary` | `#46566a` | Timestamps, meta, placeholder |
| `linear-accent` | `#5E6AD2` | Primary CTA, active state, links |
| `linear-accent-hover` | `#4f5bb8` | Hover on accent elements |
| `linear-accent-light` | `rgba(94,106,210,.12)` | Accent backgrounds, highlighted rows |
| `linear-success` | `#22d3a0` | Positive states, completed badges |
| `linear-warning` | `#f5b84c` | Alerts, overdue, capacity warnings |
| `linear-error` | `#f87171` | Destructive actions, error states |

### Border-Radius Scale (from most to least rounded)
| Class | When to use |
|---|---|
| `rounded-full` | Avatars, status pips, pill badges (intentional circles only) |
| `rounded-xl` | Page-level containers, large demo shells, feature section wrappers |
| `rounded-lg` | Cards, modals, sidebar sections, icon wrappers in marketing |
| `rounded-md` | Inputs, buttons, banners, inline chips, table rows |
| `rounded-sm` | Tiny badges, tight inline elements |

**Never use** `rounded-2xl`, `rounded-3xl`, `rounded-4xl` in app UI — these were the source of "too bubbly" feedback.

### Button Variants
| Variant | Background | Use |
|---|---|---|
| `default` | `bg-linear-accent` | Primary actions (Save, Upgrade, Submit) |
| `outline` | transparent + border | Secondary actions (Cancel, Export) |
| `ghost` | transparent | Toolbar icons, nav items |
| `destructive` | `bg-linear-error` | Delete, remove — irreversible actions |

**Never use** `bg-white text-slate-950` as a button style inside the dark-theme app.

### Tailwind v4 Canonical Classes
These v3 names are **invalid** in v4 — always use the canonical form:
| ❌ Deprecated | ✅ Use instead |
|---|---|
| `flex-shrink-0` | `shrink-0` |
| `flex-grow` | `grow` |
| `overflow-ellipsis` | `text-ellipsis` |
| `min-h-[100px]` | `min-h-25` (if on the spacing scale) |
| `min-w-[140px]` | `min-w-35` |
| `aspect-[4/5]` | `aspect-4/5` |
| `aspect-[4/3]` | `aspect-4/3` |

---

## Procedure

### 1. Identify the Target
- If a screenshot or reference component is provided, note: dominant bg color, border-radius, button style, text contrast.
- If no reference is given, use the design tokens above as ground truth.

### 2. Audit for Common Drift Patterns
Search for these known-bad patterns in the codebase:

```
# Light theme leaking into dark UI
bg-white, bg-gray-50, bg-gray-100, bg-gray-200
border-gray-200, border-gray-300
text-gray-400, text-gray-500, text-gray-700, text-gray-900

# Over-rounded / bubbly
rounded-2xl, rounded-3xl, rounded-4xl

# Wrong button colors
bg-white text-slate-950   (white button in dark UI)
bg-cyan-*, text-cyan-*    (cyan should be replaced with linear-accent)

# Tailwind v4 deprecated
flex-shrink-0, flex-grow, overflow-ellipsis
min-h-\[, min-w-\[, aspect-\[
```

Use `grep_search` with the above patterns file-by-file.

### 3. Map Each Finding to a Fix
| Found | Replace with |
|---|---|
| `bg-white` | `bg-linear-elevated` (modal) or `bg-linear-surface` (panel) |
| `bg-gray-50` / `bg-gray-100` | `bg-linear-surface` |
| `bg-gray-200` | `bg-linear-elevated` |
| `border-gray-*` | `border-linear-border` |
| `text-gray-400` / `text-gray-500` | `text-linear-text-secondary` |
| `text-gray-700` / `text-gray-900` | `text-linear-text` |
| `bg-blue-500` / `bg-blue-600` | `bg-linear-accent` |
| `bg-cyan-*` | `bg-linear-accent/15` (bg) or `bg-linear-accent` (solid) |
| `text-cyan-*` | `text-linear-accent` |
| `border-cyan-*` | `border-linear-accent/30` |
| `rounded-2xl` (app UI) | `rounded-lg` |
| `rounded-3xl` | `rounded-xl` (section wrapper) or `rounded-lg` (card) |
| `rounded-4xl` | `rounded-xl` |

### 4. Apply Fixes
- Batch independent fixes in a single `multi_replace_string_in_file` call per file.
- For mass replacements across many files, use PowerShell with `-replace`.
- After editing, run `get_errors` on each modified file.

### 5. Verify Visual Consistency
- Confirm no `bg-white`, `bg-gray-*` remain in any component that renders inside the dark-theme workspace shell.
- Confirm all buttons that are primary CTAs use `bg-linear-accent`.
- Confirm no `rounded-3xl` or `rounded-4xl` exist outside of intentional marketing sections.
- Confirm `shrink-0` is used instead of `flex-shrink-0` everywhere.

### 6. Sidebar & Layout Checks
Known layout rules:
- Main sidebar: `w-56` (224 px), `fixed left-0 top-0`
- Page-tree sidebar (notes): `fixed left-56 top-0 w-56` — **not** `ml-52`
- Main content with page tree open: `ml-112` (= 224 + 224 = 448 px)
- Main content without page tree: `ml-56`

---

## Quality Checklist
Before marking style work done:
- [ ] No `bg-white` or `bg-gray-*` in dark-themed components
- [ ] No `rounded-3xl` / `rounded-4xl` in app UI
- [ ] All primary buttons use `bg-linear-accent` (not white, not cyan)
- [ ] All links/interactive text use `text-linear-accent` (not `text-cyan-*`)
- [ ] No deprecated Tailwind v4 class names
- [ ] Sidebar positioning uses `left-56` not `ml-52`
- [ ] `get_errors` passes on all modified files