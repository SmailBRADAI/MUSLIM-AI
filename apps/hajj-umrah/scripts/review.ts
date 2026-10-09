// Usage: npm run review -- <command>. See scripts/review-lib.ts or run with --help.
import { runCli } from "./review-lib.ts";

const { code, out, err } = runCli(process.argv.slice(2));
if (out) console.log(out);
if (err) console.error(err);
process.exitCode = code;
