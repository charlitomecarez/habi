// Pre-commit guard. Stops the files that must never reach git, whatever the commit holds.
import { execFileSync } from "node:child_process";

const ALLOWED_PUBLIC_NAMES = new Set([
  "EXPO_PUBLIC_SUPABASE_URL",
  "EXPO_PUBLIC_SUPABASE_ANON_KEY",
  "EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID",
]);

const git = (...args) => execFileSync("git", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });

const problems = [];
const staged = git("diff", "--cached", "--name-only", "--diff-filter=ACMR").split("\n").filter(Boolean);

for (const file of staged) {
  const name = file.split("/").pop();
  if (/^\.env(\..*)?$/.test(name) && name !== ".env.example") problems.push(`${file}: env files stay out of git.`);
  if (/\.pdf$/i.test(name))
    problems.push(`${file}: PDF files stay out of git, because a statement must never be committed.`);
}

const added = git("diff", "--cached", "--unified=0", "--no-color", "--diff-filter=ACMR")
  .split("\n")
  .filter((line) => line.startsWith("+") && !line.startsWith("+++"));

for (const line of added) {
  for (const [name] of line.matchAll(/EXPO_PUBLIC_[A-Z0-9_]+/g)) {
    if (!ALLOWED_PUBLIC_NAMES.has(name)) {
      problems.push(`${name}: only three EXPO_PUBLIC_ names are safe in the app bundle.`);
    }
  }
}

if (problems.length > 0) {
  console.error("Commit stopped:\n" + [...new Set(problems)].map((p) => `  ${p}`).join("\n"));
  process.exit(1);
}
