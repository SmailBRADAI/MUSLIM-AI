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
  diagram?: Diagram | Diagram[]; // "tawaf" | "sai" | "miqat" | "ihram-dress" | "ihram-rules" (T049)
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
  diagramLabel?: string; // required when the step has a diagram; caption of its first diagram
  diagramItems?: Record<string, string>; // reviewed labels inside the diagrams (T049); required keys per diagram in src/data/diagrams.ts
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

### Step place visual (T047, removed from the Guide by T055)

- T055: `Guide` no longer renders `PlaceVisual`; Live mode's card still does. The `place` field and its content review are unchanged.

- Every step has a required `place` from a fixed enum (schema, `src/data/types.ts`, checked by `npm run validate:content`). It is step content, so adding or changing it bumps the step's and the journey's version (content/README.md) and goes through content review.
- Assignment: Ihram from the miqat is `miqat`; the Tamattu' pilgrim's Hajj Ihram on the 8th, taken where they stay in Makkah, is `makkah`; every Tawaf is `mataf`; the two rak'ahs after Tawaf are `maqam` (behind Maqam Ibrahim where possible); Sa'i is `masa`; shaving or shortening after the Umrah is `makkah`; on the 10th, the sacrifice and shaving are `mina` (where the Prophet ﷺ did them); the stoning is `jamarat`; the days and nights in Mina, Arafah and Muzdalifah are their own places.
- `PlaceVisual` (`src/components/PlaceVisual.tsx`) is a compact `<figure>` at the top of the step, above the instruction card, with no network or map tiles: an inline SVG route of the places in the order a pilgrim meets them (Miqat, Makkah, Jamarat, Mina, Muzdalifah, Arafah), and, for a place inside Masjid al-Haram (Mataf, Maqam, Mas'a), an inset of the Kaaba, the Mataf, Maqam Ibrahim and the Mas'a with Safa and Marwah. The step's place is filled and carries a pin and a bold, underlined name; the others are muted, so colour is not the only signal.
- Geography does not mirror with text direction: the drawing is `dir="ltr"` in every language, like the Tawaf and Sa'i diagrams; the names are HTML text under the drawing (they scale with text size and wrap instead of scrolling sideways). The graphic is `role="img"` with an `aria-label` naming the highlighted place; the visible caption ("أنا في المطاف" / "I am in the Mataf" / "میں مطاف میں ہوں") is the `figcaption`.
- Place names and captions are UI strings in `src/i18n/{ar,en,ur}.json` (`places.<place>.name`, `.here`), with one caption per place so each language can use its own preposition. The schematic shows order and grouping, not distances or exact positions; the offline map (T037) is where real positions belong.

### Booklet enrichment and illustrations (T049)

- **Source.** The booklet «صفة العمرة المصورة، خطوة... خطوة» (Ali Badawi, from the words of Ibn Baz, Dar Nour al-Islam, April 2018) is a secondary compilation. Its content is extracted page by page into `content/sources/badawi-sifat-al-umrah.md`, each point marked as covered, differing or missing against the current Umrah content. Only missing points the booklet clearly states are added (to details and mistakes of the matching step, in ar, en and ur), the step's `sources` cite the booklet and the primary sources it names, the status stays `draft`, and the journey and step versions are bumped. Differences are never silently overwritten: the existing text stays and the difference is listed in the notes file for the content reviewer.
- **New step** `umrah.ihram-rules` (order 2, ruling `wajib`: the booklet says the prohibitions "must be avoided", place `miqat`): the prohibitions of ihram and the permitted things, so later steps move down by one.
- **Illustrations** are original inline SVG React components (`src/components/Illustrations.tsx`; Tawaf and Sa'i stay in `Diagrams.tsx`): `MiqatMap`, `IhramDress`, `IhramRules`, plus an extended `TawafDiagram` (Hijr, Black Stone, Yemeni Corner, the invalid path inside the Hijr) and `SaiDiagram` (the two green markers and the zone where men run). No image of the booklet is copied or traced; figures are abstract with no faces. Each is a `<figure>` with a visible `<figcaption>`, the drawing is `role="img"` with an `aria-label` and `dir="ltr"` (geography and the Tawaf direction do not mirror), and status is never colour alone (shapes, numbers and text labels). Colours come from `src/index.css`.
- **Labels.** Names of places (Safa, Marwah, Black Stone, Yemeni Corner, Hijr) are UI strings (`diagrams.*`). Labels with religious content (who uses which miqat, what is prohibited or permitted, men's and women's dress, the invalid path in the Hijr) are reviewed step text: `diagramLabel` is the caption of the step's first diagram and `diagramItems` holds the other captions and labels. `src/data/diagrams.ts` lists the diagram ids and the `diagramItems` keys each one requires; the validator reports a missing key per language. A step may list several diagrams (`diagram` is an id or an array); the Guide shows them in order in the instruction card.
- **Tests.** Unit: each component per language (fixed `dir`, caption, accessible name, labels from the right source), content validation of the new rules, the content itself (the five miqats, the new step). E2E with axe on the miqat, Tawaf and Sa'i illustrations in Arabic, English and Urdu, and no horizontal scroll at a narrow width.

### Step pictures (T053)

- **What.** `src/data/pictures.ts` maps a step id to one of five pictures (`public/illustrations/<key>.webp`, 960 px wide, about 20 KB each); `Guide` shows it in a `<figure class="step-picture">` after the place visual. Steps without a picture (Tawaf, miqat-less steps and the rest) show nothing, so a picture is added by adding a file, a map line and three strings.
- **Provenance.** The pictures come from Figma's image generator from text prompts, supplied by the project owner. They are not the booklet's images. `content/sources/step-pictures.md` records the model, the prompts, the edits (resize, WebP, one stray text label painted out of the Sa'i picture) and the known issues the reviewer must check (invented skyline and crescent in the halq picture, Sa'i hall and markers only roughly right, the licence terms of generated images before a store release).
- **Accessibility and offline.** The `alt` text is a UI string per language (`stepPictures.*`; Arabic and Urdu need a native check). The images have `width`/`height`, `decoding="async"`, `max-width: 100%` and ride the existing service-worker precache (`webp` added to the glob).

### Live mode (T048)

- **Opt-in, session only.** A switch ("Live mode") at the top of the Guide, off by default. Its on/off state lives in memory in `App` for the session and is never stored, so a relaunch starts with it off. Only turning it on calls `navigator.geolocation.watchPosition` (`enableHighAccuracy: true`), which is when the browser asks for permission (constitution V). One line under the switch says the location stays on the device and is never saved or sent.
- **Watch lifetime.** `useGeolocation` (`src/components/LiveMode.tsx`) starts the watch when Live mode is on and the Guide is mounted, clears it when Live mode is turned off, when the Guide unmounts (another screen, another journey) and when `document.visibilityState` becomes `hidden`, and starts it again when the page is visible. Positions are kept only in React state; nothing is written to IndexedDB, Cache Storage or the network. Errors map to: denied (code 1, watch cleared), unavailable (code 2), timeout (code 3; the watch keeps trying), and unsupported (no `navigator.geolocation`). Each has a message and a "Turn off live mode" button. Under Capacitor (FR-017) the hook is the one place to swap in the native Geolocation plugin.
- **Geodata, offline.** `src/data/places-geo.ts` bundles approximate shapes (no tiles, no network): circles (Maqam Ibrahim, Mataf, Masjid al-Haram, Makkah, miqat mosques and Rabigh), corridors, i.e. a segment with a half-width (Mas'a from Safa to Marwah, the Jamarat bridge), and polygons (Mina, Muzdalifah, Arafah including Masjid Namirah). It carries `GEO_META` (source "OpenStreetMap (ODbL), approximate, pending verification", status `draft`, version) and the attribution shown in the card, "© OpenStreetMap contributors". The coordinates were reasoned from public map knowledge and must be verified against OpenStreetMap and official boundary data before release; until then the card always says "seems" and "approximate".
- **Matching** (`src/data/geofence.ts`, pure): haversine distance for circles, distance to a segment in a local flat projection for corridors, ray casting for polygons. Each region has a specificity `level` (0 Maqam; 1 Mataf, Mas'a, Jamarat; 2 Masjid al-Haram, Mina, Muzdalifah, Arafah, miqats; 3 Makkah) and the lowest level that contains the point wins. Accuracy: if the point is in the Masjid al-Haram zone the reported accuracy must be ≤ 50 m, elsewhere ≤ 300 m; otherwise the result is "uncertain" (also when nothing matches, since a poor fix cannot prove the pilgrim is outside). The result is `uncertain`, `outside` or `near` a region.
- **Suggestion** (`src/data/live.ts`, pure): each region lists the step places it matches (Mataf and Maqam match each other, since the two rak'ahs are prayed in the same area; Masjid al-Haram matches Mataf, Maqam and Mas'a; Makkah matches those and `makkah`; Mina matches Mina and the Jamarat). Candidates are the journey's steps in order (`orderedSteps`) that are not done and whose place matches. For Hajj journeys, if today is 8–13 Dhu al-Hijjah by `Intl.DateTimeFormat("en-u-ca-islamic-umalqura", { timeZone: "Asia/Riyadh" })` and a candidate's stage has that `day`, the first such candidate is suggested; otherwise the first candidate. The calendar is only a preference: the civil date changes at midnight, not at maghrib, and the Umm al-Qura date can differ from the announced sighting by a day, so it never hides a candidate. Nothing is marked done.
- **Wording (constitution I).** Region sentences are UI strings per language (`live.regions.*`): "You seem to be in the Mataf" for places inside the Haram, and "You seem to be near Arafah / Muzdalifah / Mina / the miqat of …" for places with a boundary that has a ruling, always followed by "Locations are approximate. Check the official boundary signs." The app never says the pilgrim is inside such a boundary, and says the suggestion never marks a step done.
- **Card.** When on: the region sentence is the caption of a `PlaceVisual` (which takes an optional caption), then the boundary note, then "Suggested step: <title>" with "Go to this step" (opens it in the Guide and moves focus to its title, as other step navigation does), or "This step is open below" if it is already open, or a gentle "No remaining step of your journey is performed here". Outside: "Live mode works in Makkah and at the holy sites". The attribution is in small text.
- **Accessibility.** The switch is a `button` with `role="switch"` and `aria-checked`, 48 px high. The visible card is not a live region; a separate visually hidden `role="status"` announces the detected place only when it changes, and changes between two located results (place, outside, uncertain) must hold for 3 s before the card and the announcement update, so GPS jitter at an edge does not flicker or chatter. Updates never move focus.

### Swipe and lock-screen card (T051)

- **Platform limits.** A web page or PWA cannot draw custom UI on the lock screen. Used here: a local notification (shown on the lock screen by the OS) and the Screen Wake Lock API. Android Chrome: notification with up to `Notification.maxActions` buttons (we use Previous and Next), `requireInteraction` keeps it until dismissed. iOS: notifications only for a PWA installed to the Home Screen (16.4+) after the pilgrim grants permission from a tap; no action buttons (`maxActions` is 0), so the notification is read-only and a tap opens the app. iOS Safari in a normal tab has no `Notification` support at all, and the card says so. Icons: the app has only an SVG icon; some Android versions ignore SVG notification icons, so a PNG icon set comes with the store assets (T045). **Follow-up, not built now**: an iOS Live Activity / lock-screen widget and an Android ongoing media-style notification, both in the Capacitor build (T044). No silent-audio Media Session workaround is used.
- **Swipe** (`src/data/swipe.ts`, pure, plus `useSwipe` in `src/components/useSwipe.ts`). Pointer events (touch and pen only; a mouse drag would fight text selection) on a wrapper around the place visual and instruction card, with CSS `touch-action: pan-y` so vertical scroll stays native. A swipe is recognised on `pointerup` when |dx| is at least 60 px and |dx| is at least 1.5 times |dy|. It is ignored when the gesture started inside an element that scrolls horizontally (the Tawaf and Sa'i diagrams if they ever overflow), when the text selection is not empty, when a second finger touched (pinch) or when the browser cancelled the pointer (vertical scroll). **Direction**: it follows where the next step sits in reading order. LTR: finger moves toward the left (dx negative) shows the next step. RTL (Arabic, Urdu): finger moves toward the right (dx positive) shows the next step, so right-to-left means previous. This is the mirror image a reader expects from turning pages in each script; the buttons and step list stay as they are. A swipe calls the same `goTo` as the step list, so it never marks a step done. Focus is not moved (a swipe-driven focus jump would scroll the page); instead a visually hidden `role="status"` announces "Step n of N: title". The new card slides in from the side it came from unless `prefers-reduced-motion: reduce` (checked both in CSS and by `matchMedia` in the hook, so the animation class is never added). The hint is a dismissible note, remembered in `localStorage` (`rafiq.swipeHint`, read and written inside try/catch), also dismissed by a first successful swipe and hidden on devices whose primary pointer is not coarse.
- **Lock-screen card** (`src/data/lockcard.ts` pure builder and `showStepCard` / `clearStepCard`; `src/components/LockCard.tsx` toggle, sync and messages). The opt-in is remembered on the device (`rafiq.lockCard`), but on launch it counts as on only if `Notification.permission` is still `granted`; permission is requested only inside the toggle's click handler. The notification is built from the reviewed step text: title is the step title; body is `n / N`, then, when the step's text is not approved, the localized "Pending review" label, then the first sentence of `instruction`, cut at a word boundary to 140 characters with an ellipsis. No religious string is hardcoded in code. Options: `tag: "rafiq-step"` (one notification, replaced in place), `renotify: false`, `silent: true`, `requireInteraction: true`, `lang`, `dir`, `icon` (app icon), `data: { type: "rafiq-step" }` and actions `prev` and `next` (omitted at the first and last step, and cut to `Notification.maxActions`). It is shown through `registration.showNotification` (the only way that works on Android) and re-shown whenever the step, the language, the review text or the service-worker message changes. It is closed when the toggle is turned off, when every step is done, and when the Guide unmounts. Leaving the Guide clears it, because only the Guide knows the current step.
- **Service worker.** Least invasive option: keep `generateSW` and add `workbox.importScripts: ["sw-extra.js"]`, a 40-line plain script in `public/` that only handles `notificationclick`. This leaves precaching, `navigateFallback` and the offline tests untouched, where `injectManifest` would mean owning the whole worker. The browser stores imported scripts with the worker and re-checks them for updates, so it also works offline. On a click: if a window client exists, post `{ type: "rafiq-step-action", action }` (`prev`, `next` or `open`) to it and focus it; otherwise `clients.openWindow("./?open=guide")`, and `App` opens the Guide for that query and removes it from the URL. The client changes step and re-shows the notification (a click closes it on Android).
- **Tests.** Unit tests mock `Notification`, the service-worker registration and `navigator.wakeLock`. The e2e tests use the real notification API (`registration.getNotifications()`) in a full Chromium; Chromium's headless shell reports permission but cannot show notifications, so there the e2e helper swaps in an in-memory stand-in. Permission is always requested from the tap, even when it reads "denied", since asking again is harmless and some browsers report "denied" before granting.
- **Wake lock** (`useWakeLock` in `src/components/LockCard.tsx`). `navigator.wakeLock.request("screen")` while the switch is on; the sentinel is released on switch off and unmount, and requested again on `visibilitychange` to visible (the browser releases it when the page hides). Off by default, held only in Guide state (not remembered). Errors (battery saver, permission policy) show a message, and the switch turns off.
- **Strings.** All UI text is in `src/i18n/{ar,en,ur}.json` (`swipe`, `lockCard`, `wakeLock`).

### Content review helper (T052)

- `scripts/review.ts` (CLI) over `scripts/review-lib.ts` (pure functions on parsed content, so tests do not spawn processes). `npm run review -- <command>`; `--content-dir <path>` points at a copy of `content/` (tests); the default is the real folder.
- Commands: `list` (per step, each language's status, source count, and a total such as "approved 0 / 150 texts" toward SC-002), `show <stepId>` (text, sources, ruling views and the matching lines of `content/sources/*.md`), `approve`, `unapprove`.
- `approve` is a dry run unless `--write` is given and needs an explicit `--reviewer` that is listed in `reviewers.json`; there is no default reviewer. Per language it sets the text review to approved with reviewer and date; the step `meta` becomes approved only when all three languages of that step are approved, and goes back to `draft` on `unapprove`. Any change bumps the journey patch version, and the changed steps' `meta.version` takes the new version.
- Files are rewritten with `JSON.stringify(_, null, 2)` plus a final newline, which reproduces the current files byte for byte, so only the intended fields change. After writing, `validateContent` runs; on failure the original files are restored and the command exits non-zero.
- Editing an approved text must be preceded by `unapprove` (documented in `content/README.md`); no automatic detection.

### Test site

- `main` is published to GitHub Pages (`.github/workflows/hajj-umrah-pages.yml`) at `https://<owner>.github.io/MUSLIM-AI/`, so the app can be installed on a phone over https and tested offline. The site is public but unlisted; it is a test site, not a release (store release is Phase 6).
- The app uses relative paths (Vite `base`, manifest `start_url: "./"`), so it works under a sub-path.

## Supplications per step (T034, T054)

- Data: `content/supplications.json` (id, kind, scope specific|general, Arabic, grading, meta) and per-language `content/i18n/<lang>/supplications.json` (title, when, meaning, transliteration for en, review). All entries start as draft.
- Validation: every `supplicationIds` entry on a step exists; each supplication has at least one source; scope is specific or general; each language has a text for each id.
- Loader: `src/data/content.ts` exposes `supplicationsOf(step, lang)`; the Guide renders a highlighted panel after the step details with the scope label, source, grading and review badge.
- Risk: Arabic texts and sources were drafted without online verification; the content reviewer must verify each before approval.

## Settings side panel and step hero (T056)

- `AppHeader` shows the brand and one settings button (`aria-expanded`, `aria-controls`). `SettingsPanel` is an always-mounted `<aside role="dialog" aria-modal>` that slides in from the inline end; closed it is `inert` and `visibility: hidden`, so Guide controls rendered into it by a portal (`settingsSlot`) keep their state. It holds language, journey, offline packs (formerly the Settings screen) and a Guide section for Live mode, the lock-screen card and keep-screen-on.
- The bottom navigation loses its Settings tab; Home's offline card opens the panel.
- Step hero: when `pictureOf(step.id)` exists the heading block is drawn over the picture with a dark scrim; otherwise the heading is unchanged.

## Live mode test mode (T057)

- `LiveMode` has a "Test mode" checkbox (visible while Live mode is on) and a select of `GEO_REGIONS`. In test mode `useGeolocation` is disabled and the key `near:<id>` of the chosen region drives the same card; a banner states the place is simulated. State is local to the component, so it is gone on the next launch.

## Sites page (T058)

- `src/data/sites.ts` lists the four sites with fixed coordinates and facility keys; texts (names, busy and quiet times, facilities, advice) are UI strings in ar/en/ur under `sites`, shown with a "pending verification" notice.
- `src/data/weather.ts` builds the Open-Meteo request (no key; fixed site coordinates only), parses and validates the answer, and `adviceFor` maps numbers to advice keys by thresholds (feels-like 35/40 °C, UV 8, rain chance 40%, wind 30 km/h, humidity 70%). Nothing is stored.
- `Sites` loads the weather when opened and online, with loading, offline and failed states and a refresh button.
- The AI helper is a separate step (T059).

## Ask helper (T059)

- `src/data/ask.ts`: `buildDocs` turns the journey's steps and every supplication (current language) into searchable documents with weights (title 4, instruction 2, details and mistakes 1); `search` normalises Arabic and Urdu letters, drops stop words, matches word starts, ranks by weight and by how many question words match, and returns the best sentence as the excerpt. No text is generated.
- `Ask` shows the results with the passage, sources and review badge, and "Open this step" (Guide opens on that step via `startStepId`). No match: a message and a pointer to a scholar.
- A language-model answer (summaries in the pilgrim's words) would need a server and an API key and a retrieval step that quotes the same reviewed content; it is not part of this task.

## Risks

- **Content review is the critical path.** Code can ship with draft content marked as pending, but nothing should be presented as authoritative until reviewed. The clarifications in the spec must be answered first.
- **iOS storage eviction.** Safari can evict PWA storage; mitigate with `storage.persist()`, a visible re-download prompt, and keeping packs small.
- **Nastaliq rendering.** Line height and clipping need per-screen checks in Urdu.
- **App store wrapping.** Service workers behave differently in WKWebView; the pack loader goes through one interface (`src/data/packs.ts`) so a native file-system implementation can replace Cache Storage under Capacitor.
