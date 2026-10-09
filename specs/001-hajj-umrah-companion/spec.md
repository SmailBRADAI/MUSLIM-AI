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

### User story 8 — Live mode: suggest the step for where I am (Priority: P2)

Requested by the project owner: "Based on the GPS location, I would like to have a live mode where it will detect the location and suggest the right step." At the Haram or the holy sites, a pilgrim who is unsure which step comes next turns on "Live mode" in the Guide. The app uses the phone's location, on the device only, to tell roughly where the pilgrim seems to be (for example the Mataf, the Mas'a, the Jamarat, Mina, Muzdalifah, Arafah or a miqat) and suggests the next step of their journey that is performed there. The pilgrim decides: the app never marks a step done and never rules on whether they are inside a boundary.

**Why this priority**: It saves the tired pilgrim from working out where they are in the guide, but the guide works fully without it.

**Independent test**: With the location simulated inside the Mataf, turn on Live mode on the Umrah guide: the card says "You seem to be in the Mataf", suggests Tawaf, and "Go to this step" opens it. With the location in Arafah on a Hajj guide, the card says "You seem to be near Arafah" with "Check the official boundary signs". Turn it off: location is no longer watched.

**Acceptance scenarios**:

1. **Given** the Guide is open, **Then** Live mode is off and the app has not asked for location. **When** the pilgrim turns it on, **Then** (and only then) the browser asks for location permission, and a short line says the location stays on the device and is never saved or sent.
2. **Given** Live mode is on and the location is in the Mataf with good accuracy, **Then** the card says "You seem to be in the Mataf", shows the "you are here" visual for it, and suggests the first step of the journey not yet done that is performed there (Tawaf), with "Go to this step", which opens that step in the Guide. Nothing is marked done.
3. **Given** a Hajj journey and today's date (Umm al-Qura calendar) is one of 8–13 Dhu al-Hijjah, **Then** among the matching steps not done, a step of today's day is suggested first.
4. **Given** the location is near Arafah, Muzdalifah, Mina or a miqat, **Then** the card says the pilgrim *seems to be near* it and asks them to check the official boundary signs, in every language. It never states that the pilgrim is inside the boundary.
5. **Given** the GPS accuracy is too poor to tell (worse than 50 m at Masjid al-Haram, 300 m elsewhere), **Then** the card says the location is uncertain instead of guessing.
6. **Given** the location is outside Makkah and the holy sites, **Then** the card says Live mode works in Makkah and at the holy sites. **Given** no remaining step is performed at the detected place, **Then** the card says so.
7. **Given** location permission is denied, location is unavailable, it times out, or the browser has no location support, **Then** the card says which, and offers to turn Live mode off.
8. **Given** Live mode is on, **When** the pilgrim turns it off, leaves the Guide, or the app goes to the background, **Then** the location is no longer watched.
9. **Given** a screen reader, **Then** a change of detected place is announced once it has settled for a few seconds (not on every GPS update), and focus is never moved by an update.

### User story 9 — Swipe between steps and read the step with the phone locked (Priority: P2)

Requested by the project owner: "User can swap between steps using screen swipes, also even if the phone is locked, i want to see the card which explain what should be done." A pilgrim holding a phone in one hand, or with the screen locked in a pocket, can move between the steps of the Guide with a sideways swipe and read what to do now without unlocking.

**Platform limit (honest scope)**: a web app or installed PWA cannot draw its own card on the lock screen. What the web offers is (a) a local notification, which the phone shows on the lock screen: title and short text, and on Android Chrome up to two action buttons (Previous, Next); iOS shows notifications only for a PWA installed to the Home Screen with permission granted, and without action buttons; and (b) the Screen Wake Lock API, which keeps the screen on while the Guide is open. A real lock-screen widget (iOS Live Activity, Android ongoing media-style notification) needs the native Capacitor build (T044) and is a follow-up, not part of this story. The app does not play silent audio to fake a media session.

**Why this priority**: it saves taps for a tired pilgrim, but the Guide works fully without it and no step ever requires a swipe (constitution IV).

**Independent test**: On the Guide, swipe the step card sideways: the step changes and is not marked done. Turn on "Lock-screen card" and allow notifications: a notification titled with the step's title appears, and its Next action (or the Next button in the app) moves the Guide and updates it. Turn it off: the notification disappears.

**Acceptance scenarios**:

1. **Given** the Guide on a touch screen, **When** the pilgrim swipes the step card sideways by at least 60 px, mostly horizontally, **Then** the Guide shows the previous or next step, announces it politely (without moving focus), updates the step list, and never marks a step done. In left-to-right languages, swiping toward the left shows the next step; in right-to-left languages (Arabic, Urdu), swiping toward the right shows the next step (the card moves as a page does in that reading direction). A vertical scroll, a swipe that starts on a horizontally scrollable element, or a text selection does not change the step.
2. **Given** the first visit, **Then** a small hint "Swipe to change step" is shown once, can be dismissed, and is not shown again once dismissed or after a first swipe. All buttons stay.
3. **Given** the pilgrim prefers reduced motion, **Then** the step changes without a slide animation.
4. **Given** the Guide, **Then** "Lock-screen card" is off and notification permission has not been asked. **When** the pilgrim turns it on, **Then** (and only then) the browser asks for permission, and a line says the card shows the current step as a notification so it can be read with the phone locked.
5. **Given** it is on and permission is granted, **Then** one notification shows the step's title, its number ("3 / 5"), the start of its instruction in the current language (about 140 characters) and, where the device supports it, Previous and Next actions. It is marked as pending review when the step's text is not approved. It holds no location or personal data.
6. **Given** it is on, **When** the step changes in the Guide (swipe, buttons, Live mode's "Go to this step"), or the language changes, **Then** the notification is replaced by the new step in the current language, silently. **When** the pilgrim taps Previous or Next on the notification, **Then** the open app changes step; if the app is not open, tapping opens the app on the Guide.
7. **Given** it is on, **When** the pilgrim turns it off, finishes the journey, or leaves the Guide, **Then** the notification is removed.
8. **Given** notifications are unsupported (for example iOS Safari without installing the app), or permission is denied, or showing fails, **Then** a message in the pilgrim's language says which, explains the way out where there is one, and the toggle can be turned off.
9. **Given** the Guide, **Then** an optional "Keep screen on while reading" switch, off by default, asks the browser not to dim the screen while the Guide is open and visible, re-acquires the lock when the app returns to the foreground, and says so when the browser does not support it.

### Edge cases

- Storage is full or the download is interrupted: resume, and never leave a half-installed pack marked as ready.
- The pilgrim's menstruation or illness prevents a step: the guide shows the reviewed guidance for that case instead of blocking progress (cases in scope still open, see Clarifications).
- The pilgrim completes steps out of order: progress allows it and shows what remains.
- The browser clears site storage: the app detects lost data and asks to re-download, and requests persistent storage where supported.
- Text enlarged to 200%: no content is cut off and primary actions stay reachable.
- The device storage is too slow or unavailable at launch: the app opens the Umrah guide for the session instead of onboarding, so a returning pilgrim's saved journey is never overwritten; a choice that can't be saved is reported.
- The pilgrim picks a journey whose content isn't written yet (Hajj, before US4): the guide says it is being prepared and reviewed, and never shows another journey's steps.
- Explanations of each Hajj type are religious content (Principle I): onboarding shows only the type names until reviewed explanations exist (US4).
- GPS inside Masjid al-Haram is often poor (roofs, crowds, tall buildings): Live mode says the location is uncertain rather than guessing between the Mataf and the Mas'a (US8).
- The pilgrim stands near a boundary of Arafah, Muzdalifah, Mina or a miqat: place shapes are approximate, so the app says "seems to be near" and points to the official signs; whether the pilgrim is inside is never decided by the app (US8).

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
- **FR-020**: The Guide MUST offer an opt-in Live mode, off by default and not remembered between launches. Location permission MUST be requested only when the pilgrim turns it on. The location MUST be processed on the device only: never stored (IndexedDB or elsewhere), never sent, and the watch MUST stop when Live mode is turned off, the Guide is left, or the app is hidden. The Guide MUST say so in one short line.
- **FR-021**: Place detection MUST work offline from place shapes bundled with the app (approximate shapes from OpenStreetMap, ODbL, shown with attribution and marked approximate until verified): Mataf, Maqam Ibrahim, Mas'a, Masjid al-Haram, Makkah, Mina, Jamarat, Muzdalifah, Arafah (including Namirah) and the miqats Dhul-Hulayfah (Abyar Ali), Al-Juhfah (and Rabigh), Qarn al-Manazil (As-Sayl al-Kabir), Yalamlam and Dhat Irq. The most specific matching place MUST win (Mataf, Mas'a or Jamarat before Masjid al-Haram, Makkah or Mina). If the reported accuracy is worse than 50 m at Masjid al-Haram or 300 m elsewhere, the app MUST say the location is uncertain.
- **FR-022**: Live mode MUST only suggest: the first step not done, in journey order, whose place is at the detected place; for Hajj, steps of today's Dhu al-Hijjah day (Umm al-Qura calendar) first. It MUST NOT mark a step done. It MUST NOT assert that the pilgrim is inside Arafah, Muzdalifah, Mina or a miqat: it says the pilgrim seems to be near it and to check the official boundary signs, in Arabic, English and Urdu.
- **FR-023**: Live mode MUST report permission denied, location unavailable, timeout and no browser support, each with a way to turn it off; announce settled place changes in a polite live region without moving focus; and keep 44 px targets and no sideways scroll at narrow widths.
- **FR-024**: The Guide MUST let the pilgrim change step by a horizontal swipe on the step card, as an addition to the buttons. A swipe MUST only change the step shown and MUST NOT mark it done. Direction follows the reading direction (next is the swipe toward the left in LTR languages and toward the right in RTL ones). It MUST ignore vertical scrolls, short or mostly vertical moves, swipes starting on a horizontally scrollable element, and text selection; MUST NOT slide when reduced motion is preferred; MUST announce the new step without moving focus; and MUST show a one-time dismissible hint.
- **FR-025**: The Guide MUST offer an opt-in "Lock-screen card", off by default, that shows the current step as one persistent local notification (title, "n / N" and the start of the instruction from the reviewed text of the current language, marked pending when not approved; Previous and Next actions where supported). Notification permission MUST be requested only when it is turned on. The notification MUST be kept in step with the Guide, follow the language, and be removed when turned off, on finishing the journey and on leaving the Guide. It MUST contain no location or personal data and no text that is not from the step content or UI strings. Unsupported, denied and failed states MUST be reported in the pilgrim's language.
- **FR-026**: The Guide MUST offer an optional "Keep screen on while reading" switch using the Screen Wake Lock API where available, off by default, released when turned off or when the Guide closes, re-acquired when the page becomes visible again, and reported as unavailable where unsupported.
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
- **GeoRegion** (bundled, not content-reviewed rulings): id, kind (which place it names), place shown on the visual, places whose steps it matches, specificity level, accuracy zone, whether boundary wording applies, and an approximate shape (circle, corridor or polygon). The pilgrim's location is never an entity: it is not stored.

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
