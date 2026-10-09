import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCli } from "../../scripts/review-lib";

const appDir = join(__dirname, "../..");
const STEP = "umrah.ihram";
const OTHER = "umrah.tawaf";
let dir: string;
const cli = (...args: string[]) => runCli([...args, "--content-dir", dir]);
const read = (rel: string) => JSON.parse(readFileSync(join(dir, rel), "utf8"));
const meta = (id = STEP) => {
  const j = read("journeys/umrah.json");
  return j.stages.flatMap((s: any) => s.steps).find((s: any) => s.id === id).meta;
};
const review = (lang: string, id = STEP) => read(`i18n/${lang}/umrah.json`)[id].review;
const snapshot = () => ["journeys/umrah.json", "i18n/ar/umrah.json", "i18n/en/umrah.json", "i18n/ur/umrah.json", "reviewers.json"].map((f) => readFileSync(join(dir, f), "utf8"));

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "review-"));
  cpSync(join(appDir, "content"), dir, { recursive: true });
  writeFileSync(join(dir, "reviewers.json"), JSON.stringify({ role: "content-reviewer", description: "test", reviewers: ["alice"] }, null, 2) + "\n");
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe("review helper", () => {
  it("list shows counts toward SC-002 and filters", () => {
    const r = cli("list");
    expect(r.code).toBe(0);
    expect(r.out).toMatch(/approved 0 \/ \d+ texts/);
    expect(r.out).toContain(STEP);
    const onlyUmrah = cli("list", "--journey", "umrah", "--lang", "en", "--status", "draft");
    expect(onlyUmrah.out).not.toContain("hajj-ifrad.ihram");
    expect(onlyUmrah.out).toMatch(/approved 0 \/ \d+ texts/);
    expect(cli("list", "--status", "approved").out).toContain("(no steps match)");
    expect(cli("list", "--journey", "nope").code).toBe(1);
  });

  it("show prints text, sources and source notes", () => {
    const r = cli("show", STEP, "--lang", "en");
    expect(r.out).toContain("Sources (meta.source)");
    expect(r.out).toContain("Ihram");
    expect(r.out).toContain("Ruling: Rukn");
    expect(r.out).toContain("badawi-sifat-al-umrah.md");
    expect(r.out).not.toContain("=== ar text");
    expect(r.out).not.toContain("umrah.ihram-rules"); // a longer id is not a match
    expect(cli("show", "no.such").code).toBe(1);
  });

  it("approve without --write is a dry run", () => {
    const before = snapshot();
    const r = cli("approve", STEP, "--lang", "all", "--reviewer", "alice", "--date", "2026-10-01");
    expect(r.code).toBe(0);
    expect(r.out).toContain("Dry run");
    expect(r.out).toContain("step meta: draft -> approved");
    expect(r.out).toContain("0.3.0 -> 0.3.1");
    expect(snapshot()).toEqual(before);
  });

  it("approve --write sets each language and the step only when all three are approved", () => {
    expect(cli("approve", STEP, "--lang", "ar,en", "--reviewer", "alice", "--date", "2026-10-01", "--write").code).toBe(0);
    expect(review("ar")).toEqual({ status: "approved", reviewer: "alice", reviewedAt: "2026-10-01" });
    expect(review("ur").status).toBe("draft");
    expect(meta().status).toBe("draft");
    expect(meta().version).toBe("0.3.1");
    expect(read("journeys/umrah.json").version).toBe("0.3.1");
    expect(meta(OTHER).version).toBe("0.3.0");

    expect(cli("approve", STEP, "--lang", "ur", "--reviewer", "alice", "--date", "2026-10-02", "--write").code).toBe(0);
    expect(meta()).toMatchObject({ status: "approved", reviewer: "alice", reviewedAt: "2026-10-02", version: "0.3.2" });
    expect(Object.keys(meta())).toEqual(["source", "status", "reviewer", "reviewedAt", "version"]);
    expect(read("journeys/umrah.json").version).toBe("0.3.2");
    expect(cli("list", "--journey", "umrah").out).toMatch(/approved 3 \/ \d+ texts/);
    // Approving what is already approved changes nothing and does not bump the version.
    const r = cli("approve", STEP, "--lang", "all", "--reviewer", "alice", "--write");
    expect(r.out).toContain("Nothing to change");
    expect(read("journeys/umrah.json").version).toBe("0.3.2");
  });

  it("keeps formatting: only the intended lines differ", () => {
    cli("approve", STEP, "--lang", "en", "--reviewer", "alice", "--date", "2026-10-01", "--write");
    const after = readFileSync(join(dir, "i18n/en/umrah.json"), "utf8");
    const before = readFileSync(join(appDir, "content/i18n/en/umrah.json"), "utf8");
    expect(after.split("\n").length - before.split("\n").length).toBe(2);
    expect(after.endsWith("}\n")).toBe(true);
  });

  it("refuses a reviewer who is not listed, a missing reviewer and a bad date", () => {
    const before = snapshot();
    const unlisted = cli("approve", STEP, "--lang", "all", "--reviewer", "mallory", "--write");
    expect(unlisted.code).toBe(1);
    expect(unlisted.err).toContain("not listed in content/reviewers.json");
    expect(cli("approve", STEP, "--lang", "all", "--write").err).toContain("Missing --reviewer");
    expect(cli("approve", STEP, "--lang", "all", "--reviewer", "alice", "--date", "2026-13-40", "--write").err).toContain("Invalid date");
    expect(cli("approve", STEP, "--lang", "all", "--reviewer", "alice", "--date", "1/2/2026").code).toBe(1);
    expect(cli("approve", STEP, "--reviewer", "alice", "--write").err).toContain("--lang");
    expect(snapshot()).toEqual(before);
  });

  it("restores the files when validation fails", () => {
    // Content that is already invalid (an empty Urdu title) makes the check fail after the write.
    const path = join(dir, "i18n/ur/umrah.json");
    const broken = read("i18n/ur/umrah.json");
    broken[STEP].title = "";
    writeFileSync(path, JSON.stringify(broken, null, 2) + "\n");
    const before = snapshot();
    const r = cli("approve", STEP, "--lang", "en", "--reviewer", "alice", "--write");
    expect(r.code).toBe(1);
    expect(r.err).toContain("restored");
    expect(snapshot()).toEqual(before);
  });

  it("unapprove goes back to draft and bumps the version", () => {
    cli("approve", STEP, "--lang", "all", "--reviewer", "alice", "--date", "2026-10-01", "--write");
    expect(meta().status).toBe("approved");
    const dry = cli("unapprove", STEP, "--lang", "en");
    expect(dry.out).toContain("Dry run");
    expect(review("en").status).toBe("approved");
    expect(cli("unapprove", STEP, "--lang", "en", "--write").code).toBe(0);
    expect(review("en")).toEqual({ status: "draft" });
    expect(review("ar").status).toBe("approved");
    expect(meta().status).toBe("draft");
    expect(meta()).not.toHaveProperty("reviewer");
    expect(meta()).not.toHaveProperty("reviewedAt");
    expect(read("journeys/umrah.json").version).toBe("0.3.2");
  });

  it("--all-in approves every open step of a journey, with a warning", () => {
    const dry = cli("approve", "--all-in", "umrah", "--lang", "all", "--reviewer", "alice");
    expect(dry.out).toContain("WARNING");
    expect(dry.out).toContain("Dry run");
    expect(review("en").status).toBe("draft");
    expect(cli("approve", "--all-in", "umrah", "--lang", "all", "--reviewer", "alice", "--date", "2026-10-01", "--write").code).toBe(0);
    expect(cli("list", "--journey", "umrah").out).toMatch(/approved (\d+) \/ \1 texts/);
    expect(cli("list", "--journey", "hajj-ifrad").out).toMatch(/approved 0 \//);
    expect(read("journeys/umrah.json").version).toBe("0.3.1");
    expect(cli("approve", "--all-in", "umrah", STEP, "--lang", "all", "--reviewer", "alice").code).toBe(1);
  });

  it("runs as a command (dry run) and exits non-zero on errors", () => {
    const run = (...args: string[]) =>
      spawnSync("node", ["scripts/review.ts", ...args, "--content-dir", dir], { cwd: appDir, encoding: "utf8" });
    const ok = run("approve", STEP, "--lang", "all", "--reviewer", "alice");
    expect(ok.status).toBe(0);
    expect(ok.stdout).toContain("Dry run");
    expect(review("ar").status).toBe("draft");
    const bad = run("approve", STEP, "--lang", "all", "--reviewer", "nobody", "--write");
    expect(bad.status).toBe(1);
    expect(bad.stderr).toContain("not listed");
  });
});
