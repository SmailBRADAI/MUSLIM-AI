# Implementation Plan: Rafiq — Hajj & Umrah Companion

**Branch**: `001-hajj-umrah-companion` · **Spec**: [spec.md](./spec.md) · **Constitution**: [constitution.md](../../.specify/memory/constitution.md)

## Summary

An installable, offline-first PWA in `apps/hajj-umrah`. Ritual content is structured data in versioned language packs, separate from code, so reviewers can approve content without touching components. The UI follows the Figma Make prototype already imported in PR #1.

## Technical context

| Item | Choice |
|---|---|
| Language | TypeScript 5, strict |
| UI | React 19, plain CSS with design tokens from Figma (`src/index.css`) |
| Build | Vite 8 |
| Offline | vite-plugin-pwa (Workbox `generateSW`) to precache the app shell and fonts; content packs cached with the Cache Storage API on download |
| Local data | IndexedDB through `idb` (≈1 kB) for progress, settings and installed pack metadata; `navigator.storage.persist()` requested after download |
| Fonts | Self-hosted via @fontsource: Noto Naskh Arabic, Noto Nastaliq Urdu, Manrope |
| i18n | UI strings in `src/i18n/{ar,en,ur}.json`; content text lives in the packs |
| Maps | Static offline map image or vector tiles per area (decided in research) |
| Testing | Vitest + Testing Library for units, Playwright for offline, RTL and accessibility (axe) checks |
| Target | Mobile browsers (Chrome Android, Safari iOS 16+), portrait first |
| Constraints | P1 pack < 15 MB without audio; no network calls during a ritual; no third-party analytics |

## Constitution check

| Principle | How the plan meets it |
|---|---|
| I. Sourced content | Every content item has `meta` (source, status, reviewer, version). A build-time validator fails if an item lacks it; the UI renders the "reviewed" mark only when `status === "approved"`. |
| II. Offline-first | App shell and fonts precached; packs stored in Cache Storage; progress in IndexedDB written before UI updates. |
| III. Three languages | Logical CSS properties; `dir`/`lang` set on `<html>`; direction-meaningful diagrams set `direction: ltr`. Playwright snapshots for each language. |
| IV. Real conditions | 44–48 px targets, text scaling, no gestures for essential actions, reduced motion respected. axe checks in CI. |
| V. Privacy | No accounts, no trackers, all state on device. |
| VI. Simplicity | Two dependencies added (`idb`, test tools only in dev). |

## Project structure

```text
.specify/memory/constitution.md
specs/001-hajj-umrah-companion/
├── spec.md
├── plan.md
├── tasks.md
└── contracts/content-pack.schema.json
apps/hajj-umrah/
├── content/                  # source of truth for ritual content (reviewed via PR)
│   ├── journeys/umrah.json
│   ├── journeys/hajj-tamattu.json …
│   ├── supplications.json
│   └── i18n/{ar,en,ur}/…     # per-language text keyed by content id
├── scripts/
│   ├── validate-content.ts   # schema + review-status checks
│   └── build-packs.ts        # emits public/packs/{lang}/{version}/…
├── src/
│   ├── app/                  # App shell, routing between screens
│   ├── screens/              # Onboarding, Home, Guide, Supplications, Map, Settings, Download
│   ├── components/           # StepCard, ProgressSteps, RulingTag, ReviewBadge, TawafDiagram …
│   ├── data/                 # db.ts (IndexedDB), packs.ts (download/cache), progress.ts
│   ├── i18n/                 # UI strings and language context
│   └── index.css             # design tokens
└── tests/
    ├── unit/
    └── e2e/                  # offline, rtl, a11y
```

## Content model

See `contracts/content-pack.schema.json`. In short:

```ts
type ReviewStatus = "draft" | "in-review" | "approved";
type Ruling = "rukn" | "wajib" | "sunnah" | "mustahabb";

interface ContentMeta {
  source: string[];          // e.g. "Sahih Muslim 1218", "Nusuk Umrah guide 2026"
  status: ReviewStatus;
  reviewer?: string;
  reviewedAt?: string;       // ISO date
  version: string;           // content version, e.g. "2026.10.0"
}

interface Step {
  id: string;                // "umrah.tawaf"
  order: number;
  ruling: Ruling;
  rulingNote?: string;       // i18n key explaining recognized differences
  supplicationIds: string[];
  audioId?: string;
  diagram?: "tawaf" | "sai";
  meta: ContentMeta;
  // title, instruction, details, mistakes come from i18n/{lang} by step id
}
```

## Phases

1. **Foundation**: split `App.tsx` into screens and components, move strings to i18n files, add IndexedDB storage, tests and CI.
2. **P1 stories**: content model and validator, Umrah journey data (draft status), Guide screen driven by data, onboarding, download and "Ready offline".
3. **P2 stories**: Hajj journeys by day for each type, Supplications screen with audio.
4. **P3 stories**: offline map, offline search.
5. **Polish**: accessibility pass, performance and size budget, content review sign-off.

## Risks

- **Content review is the critical path.** Code can ship with draft content marked as pending, but nothing should be presented as authoritative until reviewed. The clarifications in the spec must be answered first.
- **iOS storage eviction.** Safari can evict PWA storage; mitigate with `storage.persist()`, a visible re-download prompt, and keeping packs small.
- **Nastaliq rendering.** Line height and clipping need per-screen checks in Urdu.
