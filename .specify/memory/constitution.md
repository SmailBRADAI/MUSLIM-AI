# MUSLIM-AI Constitution

These principles govern every app in this repository (Quran, Sunnah, Islamic sciences, Hajj & Umrah).
A spec, plan or pull request that conflicts with them must change, or the constitution must be amended first.

## I. Religious content is sourced and reviewed (non-negotiable)

- Every ritual step, ruling label, Qur'anic quotation and supplication shipped to users carries a **source**, a **review status**, a **reviewer**, and a **content version**.
- Only content with review status `approved` may be shown as authoritative. Anything else is visibly marked as pending review, or is not shown.
- Rulings are labelled according to a **declared scholarly framework** (for example ركن / واجب / سنة). For the Hajj & Umrah app the framework is the fatwas of Sheikh Ibn Baz and Sheikh Ibn Al-Uthaymeen; where they differ, both views are shown. Recognized differences are explained, never presented as universal agreement.
- Translations are reviewed like the original; an approved Arabic text does not make its English or Urdu translation approved.
- AI features may help users **find and navigate approved content**. They must never generate Qur'anic text, supplications, hadith or rulings, and must say so to the user.

## II. Offline-first

- Core guidance works with no network once the user has downloaded it: instructions, progress, supplications, downloaded audio, essential maps, search over downloaded content.
- Offline is designed in from the start, not added as error handling. User progress is saved on the device immediately and never depends on a server response.
- Any online-only feature is clearly labelled as online-only.

## III. Three languages, equal experience

- Arabic, English and Urdu ship together with the same features.
- Arabic and Urdu use right-to-left layouts built with logical (direction-aware) properties, not hand-mirrored components. Each language uses appropriate typography (Naskh for Arabic, Nastaliq for Urdu).
- Elements whose direction carries meaning (for example the counter-clockwise Tawaf) never mirror with text direction.

## IV. Designed for real conditions

- Users may be tired, in crowds, using one hand, with poor eyesight or little familiarity with the rituals.
- Primary actions have touch targets of about 48×48 CSS px (never below 44). Text scales with system settings; contrast meets WCAG 2.2 AA.
- Status is never conveyed by color alone. Essential actions never require swipe or drag.
- No ads, no mandatory account, no network-dependent pop-ups, no unnecessary animation during rituals.

## V. Privacy by default

- No account is required. Progress, language and journey details stay on the device.
- No third-party trackers or analytics that send personal or location data. Any future sync or analytics is opt-in and documented.
- Location, microphone or camera access is requested only when a feature needs it, with an explanation.

## VI. Simplicity

- Show the pilgrim what to do now, what is done and what comes next. Prefer one clear path over options.
- Add dependencies only when they earn their weight in bundle size and offline storage.

## Governance

- Specs live in `specs/NNN-feature/` as `spec.md` (what and why), `plan.md` (how) and `tasks.md` (ordered work). Code changes reference the task they implement.
- Pull requests are checked against this constitution. Content changes (Principle I) need approval from a holder of the **content reviewer role** in addition to code review.
- Amendments are made by pull request that updates this file and its version.

**Version**: 1.1.0 · **Ratified**: 2026-10-09 · **Last amended**: 2026-10-09 (declared framework, reviewer role)
