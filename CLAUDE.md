# MUSLIM-AI

This repository uses spec-driven development.

- Principles: `.specify/memory/constitution.md`. Every change must respect it, especially Principle I (religious content is sourced and reviewed).
- Each feature lives in `specs/NNN-feature/` with `spec.md` (what and why), `plan.md` (how) and `tasks.md` (ordered work).
- Before coding, read the feature's spec, plan and tasks. Implement tasks in order, reference the task ID in commits, and tick the task in `tasks.md` in the same change.
- If the work needs something the spec does not cover, update the spec first.

Apps:
- `apps/hajj-umrah`: Rafiq, Hajj & Umrah companion (spec `specs/001-hajj-umrah-companion`).
