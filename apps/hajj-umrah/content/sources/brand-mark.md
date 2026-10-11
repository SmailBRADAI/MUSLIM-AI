# Brand mark: why the first icon looked like a cross (T063, FR-039)

## What was wrong

The app icon (`public/icon.svg`) and the in-app Kaaba glyph (`Icon` name `kaaba`) came from the Figma Make prototype (commit 2d1c2f6) and were never changed. Both drew the Kaaba front view with a **vertical seam through the middle and a horizontal band across it**. In the icon the two gold strokes crossed at the centre, which reads as a Christian cross, especially at small sizes and in gold on dark green. The glyph was also used on Home, in the journey cards and in onboarding.

## Why it was not caught

- The icon was imported with the prototype and treated as finished art.
- Tests check accessibility and layout, never what a mark looks like.
- No design or sensitivity review step existed for symbols, and the spec had no rule about them.

## Audit of other shapes (done on 2026-10-11)

- `Icon` set: only `close` is an X and it means close; `prayer` has three rays over a dome, not a cross. No other glyph crosses at the middle.
- Illustrations and place visuals draw the Kaaba as a square with a horizontal band only; the Tawaf diagram uses a diamond. No cross.
- Generated step pictures: reviewed in `step-pictures.md`; none shows a cross, but the reviewer checks each one.

## Fix

New icon: a crescent above a Kaaba cube with a gold kiswa band (horizontal only) and an offset door; the glyph is the same cube in outline. Nothing is centred and vertical. Checked at 22, 30, 42, 80 and 512 px.

## Rule going forward

Any new icon, logo or illustration of a sacred place or symbol is looked at at small and large sizes against FR-039 and approved by the reviewer before a store release.
