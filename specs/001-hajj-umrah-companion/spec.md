# Feature Specification: Rafiq al-Manasik (رفيق المناسك) — Hajj & Umrah Companion

**Feature branch**: `001-hajj-umrah-companion`
**Created**: 2026-10-09
**Status**: Draft
**Input**: The "Hajj Umrah Companion Design" Figma Make file and its UX brief: an app for someone performing Hajj or Umrah in real life, possibly tired, in a crowded place, unfamiliar with the rituals, using one hand and without internet. Guiding principle: help the pilgrim know what to do next, what they have completed, and what comes afterward, with as little effort as possible.

## User scenarios & testing

### User story 1 — Follow the Umrah step by step offline (Priority: P1)

A pilgrim who downloaded the guide opens the app in airplane mode at the Haram. The app shows the current Umrah stage, a short instruction, its ruling label, the next step, and a way to see details, related supplications and audio. The pilgrim marks the step complete and the app moves to the next one.

**Why this priority**: This is the app's main success criterion and the smallest slice that delivers value.

**Independent test**: Install, download the Umrah guide, switch to airplane mode, relaunch, and complete all Umrah steps from Ihram to halq/taqsir.

**Acceptance scenarios**:

1. **Given** the Umrah guide is downloaded and the device is offline, **When** the pilgrim opens the app, **Then** the home screen shows "Continue my journey" with the current step and opens it in one tap.
2. **Given** the pilgrim is on a step, **When** they tap "Mark complete — Continue", **Then** progress is saved on the device immediately and the next step is shown.
3. **Given** the pilgrim marked a step by mistake, **When** they tap "Previous step", **Then** they return to it and can unmark it.
4. **Given** any step, **Then** it shows its ruling label (per the declared framework) and its review status, and the "reviewed" mark appears only for approved content.
5. **Given** the Tawaf step in any language, **Then** the diagram shows counter-clockwise movement with the Kaaba on the pilgrim's left.
6. **Given** any step (Umrah or Hajj), **Then** a compact "you are here" visual at the top of the step shows the pilgrimage places (Miqat, Makkah with the Mataf, Maqam Ibrahim and the Mas'a, the Jamarat, Mina, Muzdalifah, Arafah) with the step's place highlighted by a marker and a bold name as well as colour, and a caption in the pilgrim's language, for example "أنا في المطاف" / "I am in the Mataf". It works offline.

### User story 2 — Choose language and journey on first launch (Priority: P1)

On first launch the pilgrim picks Arabic, English or Urdu, then Umrah or Hajj. For Hajj, the app asks the pilgrimage type (tamattu', qiran or ifrad) and the details needed to select the right guide.

**Why this priority**: The guide shown in story 1 depends on these choices.

**Independent test**: Fresh install, complete onboarding in each language, and confirm the layout direction and selected guide.

**Acceptance scenarios**:

1. **Given** a fresh install, **When** the pilgrim chooses a language, **Then** the whole UI switches language and direction (RTL for Arabic and Urdu, LTR for English) and the choice is remembered.
2. **Given** the pilgrim chooses Hajj, **When** they pick a pilgrimage type, **Then** the Hajj guide for that type is selected.
3. **Given** onboarding is done, **When** the pilgrim changes language later in Settings, **Then** progress is kept.

### User story 3 — Prepare for offline use before travelling (Priority: P1)

Before departure the pilgrim downloads the language pack, ritual instructions, supplications, checklist and essential maps, optionally with audio. The app shows a clear "Ready offline" status with download size, language and last content update.

**Why this priority**: Without it, stories 1 and 4 fail at the Haram.

**Independent test**: Download with and without audio, check reported sizes, go offline and confirm every listed item opens.

**Acceptance scenarios**:

1. **Given** the pilgrim is online, **When** they open the download screen, **Then** they see the size of each pack and audio is off by default.
2. **Given** the download finished, **Then** the home screen shows "Ready offline" with language, size and content version date.
3. **Given** a newer content version exists and the device is online, **When** the app starts, **Then** it offers the update without blocking use of the current version.

### User story 4 — Follow Hajj by day (Priority: P2)

The pilgrim follows the Hajj rites organized by day (8 to 13 Dhu al-Hijjah) for their chosen type, with the same step screen as Umrah.

**Independent test**: For each Hajj type, walk through all days offline and confirm the steps match the reviewed content for that type.

**Acceptance scenarios**:

1. **Given** the pilgrim chose tamattu', **Then** the guide begins with the Umrah and continues with the Hajj days.
2. **Given** a step where Ibn Baz and Ibn Al-Uthaymeen differ, **Then** the step shows both views with their sources; positions of other schools may appear as a note.

### User story 5 — Read and listen to supplications (Priority: P2)

The pilgrim opens supplications related to the current step or browses all of them, reads them in Arabic with translation and transliteration, and plays downloaded audio offline.

**Acceptance scenarios**:

1. **Given** a supplication, **Then** it shows its source and grading, and whether it is specific to this step or a general remembrance.
2. **Given** a step with no supplication specific to it in the Sunnah, **Then** the app does not present one as specific.

### User story 6 — See essential places offline (Priority: P3)

The pilgrim opens an offline map of key landmarks (Masjid al-Haram gates, Safa and Marwa, Mina, Muzdalifah, Arafat, Jamarat, miqat points).

**Acceptance scenarios**:

1. **Given** the device is offline, **Then** the downloaded landmarks are visible, and the app makes no promise of live traffic or routing.

### User story 7 — Search downloaded content (Priority: P3)

The pilgrim searches steps and supplications in their language, offline.

### Edge cases

- Storage is full or the download is interrupted: resume, and never leave a half-installed pack marked as ready.
- The pilgrim's menstruation or illness prevents a step: the guide shows the reviewed guidance for that case instead of blocking progress (cases in scope still open, see Clarifications).
- The pilgrim completes steps out of order: progress allows it and shows what remains.
- The browser clears site storage: the app detects lost data and asks to re-download, and requests persistent storage where supported.
- Text enlarged to 200%: no content is cut off and primary actions stay reachable.
- The device storage is too slow or unavailable at launch: the app opens the Umrah guide for the session instead of onboarding, so a returning pilgrim's saved journey is never overwritten; a choice that can't be saved is reported.
- The pilgrim picks a journey whose content isn't written yet (Hajj, before US4): the guide says it is being prepared and reviewed, and never shows another journey's steps.
- Explanations of each Hajj type are religious content (Principle I): onboarding shows only the type names until reviewed explanations exist (US4).

## Requirements

### Functional requirements

- **FR-001**: The app MUST support Arabic, English and Urdu with equal features, RTL for Arabic and Urdu, and remember the choice on the device.
- **FR-002**: The app MUST let the pilgrim choose Umrah or Hajj, and for Hajj the type (tamattu', qiran, ifrad).
- **FR-003**: Each step MUST show title, short instruction, ruling label, review status, next step, details and common mistakes, related supplications, and optional audio.
- **FR-004**: The pilgrim MUST be able to mark a step complete, go back, and see completed and remaining steps, with progress saved locally at once.
- **FR-005**: All P1 content MUST work offline after download, including fonts and app code.
- **FR-006**: The app MUST show "Ready offline" status with size, language and content version.
- **FR-007**: Every content item MUST carry source, ruling (where applicable), review status, reviewer, and version; unapproved items MUST be marked as pending review. Each language's text has its own review status: a step is shown as reviewed in a language only when both the step and that language's text are approved.
- **FR-019**: Each step MUST name the one place where it is performed, from a fixed list: miqat, mataf, maqam (Maqam Ibrahim, for the two rak'ahs after Tawaf), masa (between Safa and Marwah), makkah (elsewhere in Makkah, for example shaving or shortening after the Umrah), mina, jamarat, muzdalifah, arafah. The guide MUST show it as a "you are here" visual drawn in the app (no map tiles or network). The place is part of the step's reviewed content; the place names and caption are UI strings, since they name geography, not rulings.
- **FR-018**: If progress cannot be saved on the device, the app MUST say so instead of claiming it was saved.
- **FR-008**: Audio MUST be optional and downloaded separately.
- **FR-009**: Content updates MUST be checked only when online and MUST NOT block use of the installed version.
- **FR-010**: The app MUST NOT require an account and MUST NOT send personal or location data to third parties.
- **FR-011**: Primary actions MUST have touch targets of at least 44×44 CSS px (48 recommended), and no essential action may require a gesture.
- **FR-012**: Any AI assistant MUST be labelled online-only and MUST only return approved content. [Out of scope for v1]
- **FR-013**: Ruling labels MUST follow the fatwas of Ibn Baz and Ibn Al-Uthaymeen, citing the fatwa or book for each step.
- **FR-014**: Content MAY move to `approved` only by a holder of the content reviewer role; the app shows the reviewer role and review date, not personal data.
- **FR-015**: Maps MUST use downloaded OpenStreetMap data and show its attribution.
- **FR-016**: The app MUST be named "رفيق المناسك" in Arabic, "Rafiq al-Manasik" in English and "رفیق المناسک" in Urdu.
- **FR-017**: The app MUST avoid web-only APIs without a native fallback, so it can be wrapped for the App Store and Google Play later.

### Key entities

- **Journey**: type (umrah, hajj-tamattu, hajj-qiran, hajj-ifrad), ordered stages.
- **Stage**: a group of steps. In Hajj, each stage is either one day (8 to 13 Dhu al-Hijjah) or a named part that is not a single day: the Umrah of Tamattu', arrival in Makkah (Qiran, Ifrad), or the farewell.
- **Step**: id, order, place, title, instruction, details, common mistakes, ruling, related supplication ids, audio id, diagram, per-language text.
- **Supplication**: Arabic text, transliteration, translations, source, grading, specific-to-step or general.
- **ContentMeta**: source reference, review status (draft, in-review, approved), reviewer, reviewed date, version.
- **TextReview**: per-language review status, reviewer and date for a step's translated text.
- **Progress**: journey id, completed step ids, current step, updated time (device only).
- **ContentPack**: language, version, size, files, installed date.

## Success criteria

- **SC-001**: A pilgrim with the guide downloaded can, in airplane mode, open the app and reach the next step in 2 taps or fewer from launch.
- **SC-002**: 100% of steps and supplications shown as authoritative have review status `approved`.
- **SC-003**: Every P1 screen passes RTL and LTR layout checks in all three languages and WCAG 2.2 AA automated checks.
- **SC-004**: The full Umrah flow works offline on a fresh install after one online visit and one download.
- **SC-005**: The P1 download without audio is under 15 MB.

## Clarifications

### Session 2026-10-09 (answered by SmailBRADAI)

- Q: Which scholarly framework labels the rulings? → A: The fatwas of Sheikh Abd al-Aziz Ibn Baz and Sheikh Muhammad Ibn Salih Al-Uthaymeen. Where the two differ, the step shows both views. Other schools' positions may be mentioned as notes but do not set the label.
- Q: Who reviews the content? → A: A **content reviewer role**, not a named person. Anyone holding the role may approve content; the role holders are listed in the repository and enforced on review. Primary sources are the two sheikhs' published works and fatwas on Hajj and Umrah; practical journey information is checked against official Nusuk guidance.
- Q: Map data source? → A: OpenStreetMap (ODbL licence, attribution "© OpenStreetMap contributors" shown in the app).
- Q: App name? → A: **رفيق المناسك** (English: Rafiq al-Manasik, Urdu: رفیق المناسک).
- Q: Distribution? → A: Installable PWA first; published to the app stores later, so the code must stay wrappable in a native shell.

### Still open

- [NEEDS CLARIFICATION: Source and licence for audio recordings (narrator, recitation of supplications).]
- [NEEDS CLARIFICATION: Which menstruation and illness cases are in scope for v1.]
