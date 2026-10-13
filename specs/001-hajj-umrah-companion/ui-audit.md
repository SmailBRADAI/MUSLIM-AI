# UI audit (2026-10-13)

Method: screenshots of Home, Guide, Duas, Sites and Ask at 390 px wide in English and Arabic (RTL), read against WCAG 2.2 AA, mobile touch-target guidance (48 px), Nielsen's heuristics (visibility, recognition over recall, error prevention) and RTL practice.

## Fixed (T064, FR-040)

| Finding | Standard | Fix |
|---|---|---|
| Home hero: the Kaaba badge sat on top of the subtitle text in English | Legibility, WCAG 1.4.12 | Subtitle keeps 84 px clear of the badge; e2e checks the text rectangles never touch the badge in English and Arabic |
| Focus ring only on `button`; inputs, links, summaries and switches showed none | WCAG 2.4.7, 2.4.13 | One focus rule for all controls; e2e checks the Ask input |
| Ask page opened empty: the pilgrim had to know what to type | Recognition over recall | Four example-question chips per language; a unit test proves each finds an answer in all three languages |
| Page titles touched the header on Ask, Duas, Emergency, Sites | Visual hierarchy | Consistent top spacing |

## Already good

48 px touch targets and 76 px bottom bar; zoom not blocked; `lang` and `dir` set per language; reduced-motion respected; contrast checked by axe in CI; RTL mirrors icons and layout; one primary action per screen.

## Recommended, not done (needs a decision or content)

1. **Dark theme** (night at Muzdalifah, low battery on OLED): the palette is hard-coded in places; needs a token pass. Medium effort.
2. **Sources shown to pilgrims** include repository file paths (for example `content/sources/badawi-...md`) mixed with Arabic. They are for the reviewer. Show a clean citation to pilgrims and keep the path in reviewer tools. Content change, so the reviewer should confirm the wording.
3. **Bottom bar labels at 12 px** ("Supplications" is long): shorten to "Duas" or use 13 px with icons only on narrow phones.
4. **Home tools grid** leaves an empty cell (three cards in two columns): move the map card, or add the lap and prayer-time shortcuts when they exist.
5. **Weather failure** shows "could not be loaded"; add a retry hint and the time of the last good reading once offline caching exists.
6. Test on real devices (small Android, iPhone SE, a 200% font setting) and with TalkBack and VoiceOver in Arabic (T039).
