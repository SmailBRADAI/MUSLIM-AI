# Implementation Plan: Rafiq al-Manasik (رفيق المناسك) — Hajj & Umrah Companion

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
| Maps | OpenStreetMap: pre-rendered vector tiles for Makkah, Mina, Muzdalifah and Arafat bundled in a map pack, shown with MapLibre GL JS; ODbL attribution in the map view |
| Testing | Vitest + Testing Library for units, Playwright for offline, RTL and accessibility (axe) checks |
| Target | Mobile browsers (Chrome Android, Safari iOS 16+), portrait first; wrapped with Capacitor for the App Store and Google Play in a later phase |
| Constraints | P1 pack < 15 MB without audio; no network calls during a ritual; no third-party analytics |

## Constitution check

| Principle | How the plan meets it |
|---|---|
| I. Sourced content | Rulings follow Ibn Baz and Ibn Al-Uthaymeen; where they differ, `rulingViews` holds both. Every content item has `meta` (source, status, reviewer role holder, version). Approval is limited to the content reviewer role via `content/reviewers.json` and CODEOWNERS on `content/`. A build-time validator fails if an item lacks it; the UI renders the "reviewed" mark only when `status === "approved"`. |
| II. Offline-first | App shell and fonts precached; packs stored in Cache Storage; progress in IndexedDB written before UI updates. |
| III. Three languages | Logical CSS properties; `dir`/`lang` set on `<html>`; direction-meaningful diagrams set `direction: ltr`. Playwright snapshots for each language. |
| IV. Real conditions | 44–48 px targets, text scaling, no gestures for essential actions, reduced motion respected. axe checks in CI. |
| V. Privacy | No accounts, no trackers, all state on device. |
| VI. Simplicity | Runtime dependencies added: `idb`, and MapLibre GL JS only in the lazily loaded map screen. |

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
│   ├── reviewers.json        # GitHub handles holding the content reviewer role
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
  ruling: Ruling;            // per the framework: Ibn Baz and Ibn Al-Uthaymeen
  rulingViews?: {            // only when the two sheikhs differ
    scholar: "ibn-baz" | "ibn-uthaymeen";
    ruling: Ruling;
    source: string;
  }[];
  rulingNote?: string;       // i18n key for other schools' positions, informational only
  supplicationIds: string[];
  audioId?: string;
  diagram?: "tawaf" | "sai";
  meta: ContentMeta;
  // title, instruction, details, mistakes come from i18n/{lang} by step id
}

// content/i18n/{lang}/{journey}.json, keyed by step id. Each translation is reviewed on its own
// (constitution I); the app shows "reviewed" only when step meta AND this text are approved.
interface StepText {
  title: string;
  instruction: string;
  details: string;
  mistakes: string;
  diagramLabel?: string; // required when the step has a diagram; what the diagram shows
  review: { status: ReviewStatus; reviewer?: string; reviewedAt?: string };
}
```

## Phases

1. **Foundation**: split `App.tsx` into screens and components, move strings to i18n files, add IndexedDB storage, tests and CI.
2. **P1 stories**: content model and validator, Umrah journey data (draft status), Guide screen driven by data, onboarding, download and "Ready offline". The guide's related-supplications link and audio (FR-003) appear only once sourced supplications (T034, T035) and the audio decision (T036) exist; until then no step shows them, rather than showing empty controls.
3. **P2 stories**: Hajj journeys by day for each type, Supplications screen with audio.
4. **P3 stories**: offline OpenStreetMap map, offline search.
5. **Polish**: accessibility pass, performance and size budget, content review sign-off.
6. **App stores**: Capacitor wrapper for iOS and Android, store listings, native storage for packs.

### Packs (T025, T026)

- `npm run build` writes one pack per language to `public/packs/{lang}/{version}/content.json` and `public/packs/manifest.json` (version = content hash, size, SHA-256, last content change date from git).
- `src/data/packs.ts` downloads a pack, checks its size and SHA-256, stores it, and only then records it as installed in IndexedDB. A pack whose stored file has disappeared (cleared site data) is reported as lost, so the app can ask to download again.
- Storage goes through a small `PackStore` interface: Cache Storage on the web, native files under Capacitor later.
- "Resume": text packs are a few KB, so an interrupted download is retried from the start (up to 3 attempts) and is never marked installed. Byte-range resume is added with audio packs (T036), where files are large.
- The text content also stays bundled in the app, so the guide works before the first download; once a pack is installed for the current language, the guide reads from it.

## Risks

- **Content review is the critical path.** Code can ship with draft content marked as pending, but nothing should be presented as authoritative until reviewed. The clarifications in the spec must be answered first.
- **iOS storage eviction.** Safari can evict PWA storage; mitigate with `storage.persist()`, a visible re-download prompt, and keeping packs small.
- **Nastaliq rendering.** Line height and clipping need per-screen checks in Urdu.
- **App store wrapping.** Service workers behave differently in WKWebView; the pack loader goes through one interface (`src/data/packs.ts`) so a native file-system implementation can replace Cache Storage under Capacitor.
