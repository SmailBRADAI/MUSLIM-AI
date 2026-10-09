// Content review helper (T052, FR-028). Pure-ish functions over the parsed content so tests do not spawn
// processes; scripts/review.ts is the thin CLI. Nothing here approves anything by itself: approval needs an
// explicit reviewer handle listed in content/reviewers.json and an explicit --write.
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { LANGUAGES, STEP_TEXT_FIELDS, validateContent } from "./content-validation.ts";
import type { ContentFiles } from "./content-validation.ts";
import { defaultContentDir, readContent } from "./read-content.ts";
import type { Journey, ReviewStatus, Step } from "../src/data/types.ts";
import type { Language } from "../src/i18n/index.tsx";

export class UsageError extends Error {}

const STATUSES: readonly ReviewStatus[] = ["draft", "in-review", "approved"];
const RULING_LABELS: Record<string, string> = {
  rukn: "Rukn (pillar)",
  wajib: "Wajib (obligatory)",
  sunnah: "Sunnah",
  mustahabb: "Mustahabb (recommended)",
};

export interface StepRef {
  file: string;
  journey: Journey;
  stage: Journey["stages"][number];
  step: Step;
}

type TextEntry = Record<string, unknown> & { review?: { status: ReviewStatus; reviewer?: string; reviewedAt?: string } };

export function allSteps(files: ContentFiles): StepRef[] {
  const refs: StepRef[] = [];
  for (const [file, data] of Object.entries(files.journeys)) {
    const journey = data as Journey;
    for (const stage of journey.stages) for (const step of stage.steps) refs.push({ file, journey, stage, step });
  }
  return refs;
}

const textOf = (files: ContentFiles, lang: Language, ref: StepRef) =>
  files.texts[lang]?.[ref.file]?.[ref.step.id] as TextEntry | undefined;
const statusOf = (files: ContentFiles, lang: Language, ref: StepRef): ReviewStatus | "missing" =>
  textOf(files, lang, ref)?.review?.status ?? "missing";

function findStep(files: ContentFiles, id: string): StepRef {
  const ref = allSteps(files).find((r) => r.step.id === id);
  if (!ref) throw new UsageError(`No step with id "${id}". Run "list" to see the step ids.`);
  return ref;
}

export function parseLangs(value: string | undefined, required: boolean): Language[] {
  if (value === undefined) {
    if (required) throw new UsageError('Missing --lang. Use --lang ar,en,ur or --lang all.');
    return [...LANGUAGES];
  }
  if (value === "all") return [...LANGUAGES];
  const langs = value.split(",").map((l) => l.trim());
  for (const l of langs) {
    if (!(LANGUAGES as readonly string[]).includes(l)) throw new UsageError(`Unknown language "${l}". Use ar, en, ur or all.`);
  }
  return LANGUAGES.filter((l) => langs.includes(l));
}

export function parseDate(value: string | undefined, now = new Date()): string {
  if (value === undefined) {
    const p = (n: number) => String(n).padStart(2, "0");
    return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
  }
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const d = m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : undefined;
  if (!m || !d || d.getUTCFullYear() !== +m[1] || d.getUTCMonth() !== +m[2] - 1 || d.getUTCDate() !== +m[3]) {
    throw new UsageError(`Invalid date "${value}". Use YYYY-MM-DD, for example 2026-10-09.`);
  }
  return value;
}

function parseStatus(value: string | undefined): ReviewStatus | undefined {
  if (value === undefined) return undefined;
  const v = value.replace("_", "-") as ReviewStatus;
  if (!STATUSES.includes(v)) throw new UsageError(`Unknown status "${value}". Use draft, in-review or approved.`);
  return v;
}

function journeyFiles(files: ContentFiles, id: string | undefined): string[] {
  const all = Object.keys(files.journeys);
  if (id === undefined) return all;
  const match = all.filter((f) => (files.journeys[f] as Journey).id === id || f === id || f === `${id}.json`);
  if (!match.length) {
    const ids = all.map((f) => (files.journeys[f] as Journey).id).join(", ");
    throw new UsageError(`No journey "${id}". Journeys: ${ids}.`);
  }
  return match;
}

// ---------------------------------------------------------------- list

export function listSteps(files: ContentFiles, opts: { journey?: string; lang?: string; status?: string }): string {
  const langs = parseLangs(opts.lang, false);
  const status = parseStatus(opts.status);
  const scope = journeyFiles(files, opts.journey);
  const refs = allSteps(files).filter((r) => scope.includes(r.file));

  const count: Record<string, number> = { approved: 0, "in-review": 0, draft: 0, missing: 0 };
  let fullyApproved = 0;
  for (const r of refs) {
    for (const l of langs) count[statusOf(files, l, r)]++;
    if (r.step.meta.status === "approved" && langs.every((l) => statusOf(files, l, r) === "approved")) fullyApproved++;
  }
  const total = refs.length * langs.length;

  const shown = refs.filter((r) => status === undefined || langs.some((l) => statusOf(files, l, r) === status));
  const rows = [["step", "step status", ...langs, "sources"], ...shown.map((r) => [
    r.step.id, r.step.meta.status, ...langs.map((l) => statusOf(files, l, r)), String(r.step.meta.source?.length ?? 0),
  ])];
  const widths = rows[0].map((_, i) => Math.max(...rows.map((row) => row[i].length)));
  const lines = rows.map((row) => row.map((c, i) => c.padEnd(widths[i])).join("  ").trimEnd());
  lines.splice(1, 0, widths.map((w) => "-".repeat(w)).join("  "));
  if (!shown.length) lines.push("(no steps match)");
  lines.push(
    "",
    `approved ${count.approved} / ${total} texts (in review ${count["in-review"]}, draft ${count.draft}${count.missing ? `, missing ${count.missing}` : ""})`,
    `steps fully approved (step and every listed language): ${fullyApproved} / ${refs.length}`,
  );
  return lines.join("\n");
}

// ---------------------------------------------------------------- show

/** Lines of the secondary-source notes that mention the step id (a plain search, no more). */
export function sourceNotesFor(contentDir: string, stepId: string): string[] {
  const dir = join(contentDir, "sources");
  if (!existsSync(dir)) return [];
  const escaped = stepId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(?<![\\w.-])${escaped}(?![\\w-]|\\.\\w)`);
  const out: string[] = [];
  for (const f of readdirSync(dir).filter((n) => n.endsWith(".md")).sort()) {
    readFileSync(join(dir, f), "utf8").split("\n").forEach((line, i) => {
      if (re.test(line)) out.push(`${f}:${i + 1}: ${line.trim()}`);
    });
  }
  return out;
}

export function showStep(files: ContentFiles, contentDir: string, stepId: string, langOpt?: string): string {
  const langs = parseLangs(langOpt, false);
  const ref = findStep(files, stepId);
  const { step, stage, journey } = ref;
  const where = stage.day !== undefined ? `day ${stage.day}` : stage.kind ? `part "${stage.kind}"` : "";
  const out: string[] = [
    `Step ${step.id}`,
    `Journey ${journey.id} (version ${journey.version}), stage ${stage.id}${where ? ` (${where})` : ""}, order ${step.order}`,
    `Ruling: ${RULING_LABELS[step.ruling] ?? step.ruling}`,
    `Place: ${step.place}`,
    `Step status: ${step.meta.status}${step.meta.reviewer ? `, reviewer ${step.meta.reviewer}` : ""}${step.meta.reviewedAt ? `, ${step.meta.reviewedAt}` : ""}, version ${step.meta.version}`,
    "",
    "Sources (meta.source):",
    ...(step.meta.source?.length ? step.meta.source.map((s, i) => `  ${i + 1}. ${s}`) : ["  (none)"]),
  ];
  if (step.rulingViews?.length) {
    out.push("", "Ruling views:", ...step.rulingViews.map((v) => `  ${v.scholar}: ${RULING_LABELS[v.ruling] ?? v.ruling}. Source: ${v.source}`));
  }
  for (const lang of langs) {
    const t = textOf(files, lang, ref);
    out.push("", `=== ${lang} text ===`);
    if (!t) {
      out.push("(missing)");
      continue;
    }
    const r = t.review;
    out.push(`Review: ${r?.status ?? "missing"}${r?.reviewer ? `, reviewer ${r.reviewer}` : ""}${r?.reviewedAt ? `, ${r.reviewedAt}` : ""}`);
    const field = (label: string, value: unknown) => {
      if (typeof value === "string" && value.trim()) out.push("", `${label}:`, value);
    };
    for (const f of STEP_TEXT_FIELDS) field(f, t[f]);
    if (step.rulingNote) field(`otherSchools (${step.rulingNote})`, t[step.rulingNote]);
    field("diagramLabel", t.diagramLabel);
    const items = t.diagramItems as Record<string, string> | undefined;
    if (items) out.push("", "diagramItems:", ...Object.entries(items).map(([k, v]) => `  ${k}: ${v}`));
  }
  const notes = sourceNotesFor(contentDir, stepId);
  out.push("", "Notes for the reviewer in content/sources (lines that mention this step):", ...(notes.length ? notes.map((n) => `  ${n}`) : ["  (none)"]));
  return out.join("\n");
}

// ---------------------------------------------------------------- approve / unapprove

export interface ChangeOptions {
  action: "approve" | "unapprove";
  stepIds: string[];
  /** Approve every step in this journey whose selected languages are not all approved. */
  allIn?: string;
  langs: Language[];
  reviewer?: string;
  date?: string;
}

export interface Plan {
  lines: string[];
  changed: boolean;
  next: ContentFiles;
  touchedJourneys: Set<string>;
  touchedTexts: Set<string>; // "lang/file"
}

function bumpPatch(version: string): string {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!m) throw new UsageError(`Journey version "${version}" is not x.y.z, so it cannot be bumped. Fix it by hand first.`);
  return `${m[1]}.${m[2]}.${+m[3] + 1}`;
}

function setMetaReview(meta: Record<string, unknown>, status: ReviewStatus, reviewer?: string, reviewedAt?: string) {
  const entries = Object.entries(meta).filter(([k]) => k !== "reviewer" && k !== "reviewedAt");
  for (const k of Object.keys(meta)) delete meta[k];
  for (const [k, v] of entries) {
    meta[k] = k === "status" ? status : v;
    if (k === "status" && status === "approved") {
      meta.reviewer = reviewer;
      meta.reviewedAt = reviewedAt;
    }
  }
}

export function planChange(files: ContentFiles, opts: ChangeOptions): Plan {
  const approving = opts.action === "approve";
  let reviewer = "";
  let date = "";
  if (approving) {
    if (!opts.reviewer) throw new UsageError("Missing --reviewer. There is no default reviewer; give your own GitHub handle.");
    if (!files.reviewers.reviewers.includes(opts.reviewer)) {
      const listed = files.reviewers.reviewers.length ? files.reviewers.reviewers.join(", ") : "nobody yet";
      throw new UsageError(`"${opts.reviewer}" is not listed in content/reviewers.json (listed: ${listed}). Nothing was changed.`);
    }
    reviewer = opts.reviewer;
    date = parseDate(opts.date);
  }
  if (opts.allIn && opts.stepIds.length) throw new UsageError("Give step ids or --all-in <journeyId>, not both.");
  if (!opts.allIn && !opts.stepIds.length) throw new UsageError(`Give at least one step id, or --all-in <journeyId>.`);

  const next: ContentFiles = { ...files, journeys: structuredClone(files.journeys), texts: structuredClone(files.texts) };
  const refs = opts.allIn
    ? allSteps(next).filter((r) => journeyFiles(next, opts.allIn).includes(r.file) && opts.langs.some((l) => statusOf(next, l, r) !== "approved"))
    : opts.stepIds.map((id) => findStep(next, id));
  const lines: string[] = [];
  const touchedJourneys = new Set<string>();
  const touchedTexts = new Set<string>();
  const changedPerFile = new Map<string, Step[]>();

  for (const ref of refs) {
    const stepLines: string[] = [];
    let stepChanged = false;
    for (const lang of opts.langs) {
      const text = textOf(next, lang, ref);
      if (!text?.review) throw new UsageError(`"${ref.step.id}" has no ${lang} text to review.`);
      const before = text.review.status;
      if (approving ? before === "approved" : before === "draft") {
        stepLines.push(`  ${lang} text: already ${before}, no change`);
        continue;
      }
      text.review = approving ? { status: "approved", reviewer, reviewedAt: date } : { status: "draft" };
      stepLines.push(`  ${lang} text: ${before} -> ${approving ? `approved (reviewer ${reviewer}, ${date})` : "draft (reviewer and date removed)"}`);
      touchedTexts.add(`${lang}/${ref.file}`);
      stepChanged = true;
    }
    // The step itself is approved only when every language of it is approved (FR-007).
    const allApproved = LANGUAGES.every((l) => statusOf(next, l, ref) === "approved");
    const meta = ref.step.meta as unknown as Record<string, unknown>;
    if (approving && allApproved && ref.step.meta.status !== "approved") {
      stepLines.push(`  step meta: ${ref.step.meta.status} -> approved (reviewer ${reviewer}, ${date})`);
      setMetaReview(meta, "approved", reviewer, date);
      stepChanged = true;
    } else if (approving && !allApproved) {
      const waiting = LANGUAGES.filter((l) => statusOf(next, l, ref) !== "approved").join(", ");
      stepLines.push(`  step meta: stays ${ref.step.meta.status} (waiting for ${waiting})`);
    } else if (!approving && ref.step.meta.status === "approved") {
      stepLines.push("  step meta: approved -> draft (reviewer and date removed)");
      setMetaReview(meta, "draft");
      stepChanged = true;
    }
    lines.push(ref.step.id, ...stepLines);
    if (stepChanged) {
      touchedJourneys.add(ref.file);
      changedPerFile.set(ref.file, [...(changedPerFile.get(ref.file) ?? []), ref.step]);
    }
  }

  for (const [file, steps] of changedPerFile) {
    const journey = next.journeys[file] as Journey;
    const from = journey.version;
    journey.version = bumpPatch(from);
    for (const s of steps) s.meta.version = journey.version;
    lines.push(`${file}: journey version ${from} -> ${journey.version} (also set on ${steps.length} changed step${steps.length === 1 ? "" : "s"})`);
  }
  if (!changedPerFile.size) lines.push("Nothing to change.");
  return { lines, changed: changedPerFile.size > 0, next, touchedJourneys, touchedTexts };
}

const writeJson = (path: string, data: unknown) => writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);

/** Writes the plan, validates the result, and restores the original files if validation fails. Returns the errors. */
export function applyPlan(plan: Plan, contentDir: string): string[] {
  const targets: [string, unknown][] = [
    ...[...plan.touchedJourneys].map((f): [string, unknown] => [join(contentDir, "journeys", f), plan.next.journeys[f]]),
    ...[...plan.touchedTexts].map((k): [string, unknown] => {
      const [lang, file] = k.split("/");
      return [join(contentDir, "i18n", lang, file), plan.next.texts[lang][file]];
    }),
  ];
  const originals = targets.map(([path]) => [path, readFileSync(path, "utf8")] as const);
  const restore = () => originals.forEach(([path, text]) => writeFileSync(path, text));
  try {
    for (const [path, data] of targets) writeJson(path, data);
    const errors = validateContent(readContent(contentDir));
    if (errors.length) restore();
    return errors;
  } catch (e) {
    restore();
    throw e;
  }
}

// ---------------------------------------------------------------- CLI

const VALUE_FLAGS = ["journey", "lang", "status", "reviewer", "date", "all-in", "content-dir"];
const USAGE = `Content review helper.
Usage: npm run review -- <command> [options]
  list [--journey <id>] [--lang ar|en|ur] [--status draft|in-review|approved]
  show <stepId> [--lang ar]
  approve <stepId...> --lang ar,en,ur|all --reviewer <handle> [--date YYYY-MM-DD] [--write]
  approve --all-in <journeyId> --lang ... --reviewer <handle> [--write]
  unapprove <stepId...> --lang ... [--write]
Approve and unapprove are a dry run until --write is given. --content-dir <path> uses a copy of content/.`;

export interface CliResult {
  code: number;
  out: string;
  err: string;
}

export function runCli(argv: string[]): CliResult {
  try {
    const flags: Record<string, string> = {};
    const positional: string[] = [];
    let write = false;
    for (let i = 0; i < argv.length; i++) {
      const arg = argv[i];
      if (!arg.startsWith("--")) {
        positional.push(arg);
        continue;
      }
      const [name, inline] = arg.slice(2).split(/=(.*)/s);
      if (name === "write") write = true;
      else if (name === "help") return { code: 0, out: USAGE, err: "" };
      else if (VALUE_FLAGS.includes(name)) {
        const value = inline ?? argv[++i];
        if (value === undefined || value.startsWith("--")) throw new UsageError(`--${name} needs a value.`);
        flags[name] = value;
      } else throw new UsageError(`Unknown option --${name}.`);
    }
    const [command, ...rest] = positional;
    const contentDir = flags["content-dir"] ?? defaultContentDir;
    if (!command) return { code: 1, out: "", err: USAGE };
    if (!["list", "show", "approve", "unapprove"].includes(command)) throw new UsageError(`Unknown command "${command}".\n${USAGE}`);
    const files = readContent(contentDir);

    if (command === "list") return { code: 0, out: listSteps(files, { journey: flags.journey, lang: flags.lang, status: flags.status }), err: "" };
    if (command === "show") {
      if (rest.length !== 1) throw new UsageError("Usage: show <stepId> [--lang ar]");
      return { code: 0, out: showStep(files, contentDir, rest[0], flags.lang), err: "" };
    }

    const plan = planChange(files, {
      action: command as "approve" | "unapprove",
      stepIds: rest,
      allIn: flags["all-in"],
      langs: parseLangs(flags.lang, true),
      reviewer: flags.reviewer,
      date: flags.date,
    });
    const out = [...plan.lines];
    if (flags["all-in"] && command === "approve" && plan.changed) {
      out.unshift("WARNING: approving every open step of a journey in one go. Approve only texts you have read in full; every approval is your own decision.", "");
    }
    if (!plan.changed) return { code: 0, out: out.join("\n"), err: "" };
    if (!write) {
      out.unshift("Dry run: nothing was written. Add --write to apply these changes.", "");
      return { code: 0, out: out.join("\n"), err: "" };
    }
    const errors = applyPlan(plan, contentDir);
    if (errors.length) {
      return { code: 1, out: "", err: `Content check failed, so the files were restored and nothing changed:\n${errors.map((e) => `  - ${e}`).join("\n")}` };
    }
    out.push("", "Written. Content check passed.");
    return { code: 0, out: out.join("\n"), err: "" };
  } catch (e) {
    if (e instanceof UsageError) return { code: 1, out: "", err: `Error: ${e.message}` };
    throw e;
  }
}
