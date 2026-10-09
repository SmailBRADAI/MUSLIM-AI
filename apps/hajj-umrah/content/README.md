# Ritual content

Source of truth for ritual steps, rulings and supplications (spec `specs/001-hajj-umrah-companion`).

- Every item follows `specs/001-hajj-umrah-companion/contracts/content-pack.schema.json`.
- Only a GitHub user listed in `reviewers.json` (the content reviewer role) may set `status` to `approved`. `.github/CODEOWNERS` requires their review on this folder.
- To add a reviewer: add their GitHub handle to `reviewers.json` and to the `apps/hajj-umrah/content/` line in `.github/CODEOWNERS`, in the same pull request.
- Any change to a journey or its texts, including a review status change, bumps that journey's `version`. The app prefers its bundled copy over an installed pack unless the pack's version is newer.
- `sources/` holds notes on secondary sources that were read to enrich the content (for example the booklet «صفة العمرة المصورة»): what each says, what the content already covers, and the differences left for the content reviewer. They are not shown in the app.

## Reviewing

The review helper lets the content reviewer approve content without editing JSON by hand. Run it from `apps/hajj-umrah`:

- `npm run review -- list [--journey <id>] [--lang ar|en|ur] [--status draft|in-review|approved]` shows each step's status per language, the number of sources, and a total such as "approved 0 / 168 texts" (progress to SC-002).
- `npm run review -- show <stepId> [--lang ar]` prints the step as the reviewer needs to read it: text, sources, ruling views, and the lines of `sources/*.md` that mention the step.
- `npm run review -- approve <stepId...> --lang ar,en,ur|all --reviewer <handle> [--date YYYY-MM-DD] [--write]`, or `approve --all-in <journeyId> ...` for every step of a journey that is not yet approved.
- `npm run review -- unapprove <stepId...> --lang ... [--write]` sets the text back to `draft` and removes reviewer and date.

`approve` and `unapprove` are a dry run until `--write` is added: first run without it and read what would change, then run again with `--write`. A write bumps the journey's patch version (and the changed steps' `meta.version`), then runs the content check and restores the files if it fails. The step's own `meta` becomes `approved` only when all three languages of that step are approved, and goes back to `draft` when any language is unapproved.

Every approval is the reviewer's own decision. The helper never approves on its own: it needs `--reviewer` with a handle listed in `reviewers.json` and `--write`, and there is no default. `--all-in` is only for a reviewer who has read every text in it.

If an approved text must be edited, run `unapprove` for it first, edit, then review and approve again. Nothing detects an edit made to an approved text, so skipping this leaves approval on text the reviewer did not read.
