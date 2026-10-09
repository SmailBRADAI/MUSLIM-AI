# Ritual content

Source of truth for ritual steps, rulings and supplications (spec `specs/001-hajj-umrah-companion`).

- Every item follows `specs/001-hajj-umrah-companion/contracts/content-pack.schema.json`.
- Only a GitHub user listed in `reviewers.json` (the content reviewer role) may set `status` to `approved`. `.github/CODEOWNERS` requires their review on this folder.
- To add a reviewer: add their GitHub handle to `reviewers.json` and to the `apps/hajj-umrah/content/` line in `.github/CODEOWNERS`, in the same pull request.
