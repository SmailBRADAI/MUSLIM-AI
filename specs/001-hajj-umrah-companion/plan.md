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
| V. Privacy | No accounts, no trackers, all state on device. Live mode (T048) asks for location only when turned on, processes it on the device, never stores or sends it, and stops watching when off, hidden or away from the Guide. |
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
type Place = "miqat" | "mataf" | "maqam" | "masa" | "makkah" | "mina" | "jamarat" | "muzdalifah" | "arafah";

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
  place: Place;              // where the step is performed (T047)
  meta: ContentMeta;
  // title, instruction, details, mistakes come from i18n/{lang} by step id
}

interface Stage {
  id: string;
  order: number;
  day?: number;              // Hajj: Dhu al-Hijjah day, 8–13
  kind?: "umrah" | "arrival" | "farewell"; // Hajj: a stage that is not one day; exactly one of day/kind
  steps: Step[];
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
- The text content also stays bundled in the app, so the guide works before the first download. The guide reads an installed pack only when its journey version is newer than the bundled one, so an old download never hides a correction or a withdrawn approval. Every content change therefore bumps the journey's `version` (content/README.md).
- Downloads continue when the pilgrim leaves Settings; the old pack's file is deleted after an update. Checks that need the network re-run when the device comes back online.

### Hajj journeys (T031–T033)

- One journey file per type: `hajj-tamattu`, `hajj-qiran`, `hajj-ifrad`. Step ids are unique across journeys, so each journey has its own steps and texts; progress is already stored per journey.
- Tamattu' begins with its own Umrah stage (`kind: "umrah"`), whose texts reuse the Umrah guide's wording where it applies, with the Tamattu' intention and shortening (rather than shaving) before the Hajj. Qiran and Ifrad begin with arrival in Makkah (`kind: "arrival"`): ihram, Tawaf al-Qudum and the optional early Sa'i. All three end with the Farewell Tawaf (`kind: "farewell"`).
- The Guide shows the stage of the open step (day number and name, or the part's name) and groups the step list by stage. Stage names are UI strings (`src/i18n`), not content, since they only name the day.
- Ruling labels follow Ibn Baz and Ibn Al-Uthaymeen. Where the two differ on a detail rather than the label, the step's details state both views; `rulingViews` is used only when their labels differ. Other schools' positions go in the step's `otherSchools` note (`rulingNote`), shown under "Other schools" in the details.

### Step place visual (T047)

- Every step has a required `place` from a fixed enum (schema, `src/data/types.ts`, checked by `npm run validate:content`). It is step content, so adding or changing it bumps the step's and the journey's version (content/README.md) and goes through content review.
- Assignment: Ihram from the miqat is `miqat`; the Tamattu' pilgrim's Hajj Ihram on the 8th, taken where they stay in Makkah, is `makkah`; every Tawaf is `mataf`; the two rak'ahs after Tawaf are `maqam` (behind Maqam Ibrahim where possible); Sa'i is `masa`; shaving or shortening after the Umrah is `makkah`; on the 10th, the sacrifice and shaving are `mina` (where the Prophet ﷺ did them); the stoning is `jamarat`; the days and nights in Mina, Arafah and Muzdalifah are their own places.
- `PlaceVisual` (`src/components/PlaceVisual.tsx`) is a compact `<figure>` at the top of the step, above the instruction card, with no network or map tiles: an inline SVG route of the places in the order a pilgrim meets them (Miqat, Makkah, Jamarat, Mina, Muzdalifah, Arafah), and, for a place inside Masjid al-Haram (Mataf, Maqam, Mas'a), an inset of the Kaaba, the Mataf, Maqam Ibrahim and the Mas'a with Safa and Marwah. The step's place is filled and carries a pin and a bold, underlined name; the others are muted, so colour is not the only signal.
- Geography does not mirror with text direction: the drawing is `dir="ltr"` in every language, like the Tawaf and Sa'i diagrams; the names are HTML text under the drawing (they scale with text size and wrap instead of scrolling sideways). The graphic is `role="img"` with an `aria-label` naming the highlighted place; the visible caption ("أنا في المطاف" / "I am in the Mataf" / "میں مطاف میں ہوں") is the `figcaption`.
- Place names and captions are UI strings in `src/i18n/{ar,en,ur}.json` (`places.<place>.name`, `.here`), with one caption per place so each language can use its own preposition. The schematic shows order and grouping, not distances or exact positions; the offline map (T037) is where real positions belong.

### Live mode (T048)

- **Opt-in, session only.** A switch ("Live mode") at the top of the Guide, off by default. Its on/off state lives in memory in `App` for the session and is never stored, so a relaunch starts with it off. Only turning it on calls `navigator.geolocation.watchPosition` (`enableHighAccuracy: true`), which is when the browser asks for permission (constitution V). One line under the switch says the location stays on the device and is never saved or sent.
- **Watch lifetime.** `useGeolocation` (`src/components/LiveMode.tsx`) starts the watch when Live mode is on and the Guide is mounted, clears it when Live mode is turned off, when the Guide unmounts (another screen, another journey) and when `document.visibilityState` becomes `hidden`, and starts it again when the page is visible. Positions are kept only in React state; nothing is written to IndexedDB, Cache Storage or the network. Errors map to: denied (code 1, watch cleared), unavailable (code 2), timeout (code 3; the watch keeps trying), and unsupported (no `navigator.geolocation`). Each has a message and a "Turn off live mode" button. Under Capacitor (FR-017) the hook is the one place to swap in the native Geolocation plugin.
- **Geodata, offline.** `src/data/places-geo.ts` bundles approximate shapes (no tiles, no network): circles (Maqam Ibrahim, Mataf, Masjid al-Haram, Makkah, miqat mosques and Rabigh), corridors, i.e. a segment with a half-width (Mas'a from Safa to Marwah, the Jamarat bridge), and polygons (Mina, Muzdalifah, Arafah including Masjid Namirah). It carries `GEO_META` (source "OpenStreetMap (ODbL), approximate, pending verification", status `draft`, version) and the attribution shown in the card, "© OpenStreetMap contributors". The coordinates were reasoned from public map knowledge and must be verified against OpenStreetMap and official boundary data before release; until then the card always says "seems" and "approximate".
- **Matching** (`src/data/geofence.ts`, pure): haversine distance for circles, distance to a segment in a local flat projection for corridors, ray casting for polygons. Each region has a specificity `level` (0 Maqam; 1 Mataf, Mas'a, Jamarat; 2 Masjid al-Haram, Mina, Muzdalifah, Arafah, miqats; 3 Makkah) and the lowest level that contains the point wins. Accuracy: if the point is in the Masjid al-Haram zone the reported accuracy must be ≤ 50 m, elsewhere ≤ 300 m; otherwise the result is "uncertain" (also when nothing matches, since a poor fix cannot prove the pilgrim is outside). The result is `uncertain`, `outside` or `near` a region.
- **Suggestion** (`src/data/live.ts`, pure): each region lists the step places it matches (Mataf and Maqam match each other, since the two rak'ahs are prayed in the same area; Masjid al-Haram matches Mataf, Maqam and Mas'a; Makkah matches those and `makkah`; Mina matches Mina and the Jamarat). Candidates are the journey's steps in order (`orderedSteps`) that are not done and whose place matches. For Hajj journeys, if today is 8–13 Dhu al-Hijjah by `Intl.DateTimeFormat("en-u-ca-islamic-umalqura", { timeZone: "Asia/Riyadh" })` and a candidate's stage has that `day`, the first such candidate is suggested; otherwise the first candidate. The calendar is only a preference: the civil date changes at midnight, not at maghrib, and the Umm al-Qura date can differ from the announced sighting by a day, so it never hides a candidate. Nothing is marked done.
- **Wording (constitution I).** Region sentences are UI strings per language (`live.regions.*`): "You seem to be in the Mataf" for places inside the Haram, and "You seem to be near Arafah / Muzdalifah / Mina / the miqat of …" for places with a boundary that has a ruling, always followed by "Locations are approximate. Check the official boundary signs." The app never says the pilgrim is inside such a boundary, and says the suggestion never marks a step done.
- **Card.** When on: the region sentence is the caption of a `PlaceVisual` (which takes an optional caption), then the boundary note, then "Suggested step: <title>" with "Go to this step" (opens it in the Guide and moves focus to its title, as other step navigation does), or "This step is open below" if it is already open, or a gentle "No remaining step of your journey is performed here". Outside: "Live mode works in Makkah and at the holy sites". The attribution is in small text.
- **Accessibility.** The switch is a `button` with `role="switch"` and `aria-checked`, 48 px high. The visible card is not a live region; a separate visually hidden `role="status"` announces the detected place only when it changes, and changes between two located results (place, outside, uncertain) must hold for 3 s before the card and the announcement update, so GPS jitter at an edge does not flicker or chatter. Updates never move focus.

### Test site

- `main` is published to GitHub Pages (`.github/workflows/hajj-umrah-pages.yml`) at `https://<owner>.github.io/MUSLIM-AI/`, so the app can be installed on a phone over https and tested offline. The site is public but unlisted; it is a test site, not a release (store release is Phase 6).
- The app uses relative paths (Vite `base`, manifest `start_url: "./"`), so it works under a sub-path.

## Risks

- **Content review is the critical path.** Code can ship with draft content marked as pending, but nothing should be presented as authoritative until reviewed. The clarifications in the spec must be answered first.
- **iOS storage eviction.** Safari can evict PWA storage; mitigate with `storage.persist()`, a visible re-download prompt, and keeping packs small.
- **Nastaliq rendering.** Line height and clipping need per-screen checks in Urdu.
- **App store wrapping.** Service workers behave differently in WKWebView; the pack loader goes through one interface (`src/data/packs.ts`) so a native file-system implementation can replace Cache Storage under Capacitor.
