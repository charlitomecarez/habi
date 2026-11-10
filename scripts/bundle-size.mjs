// Checks the web bundle against its budget. Run after `npx expo export --platform web`.
// The budget is the size when it was set, plus 10%. Raise it on purpose, in its own commit.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const DIST = process.argv[2] ?? "dist";
const BUDGET_FILE = new URL("../bundle-budget.json", import.meta.url);

function jsBytes(dir) {
  let total = 0;
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) total += jsBytes(path);
    else if (name.endsWith(".js")) total += stat.size;
  }
  return total;
}

const kb = (bytes) => `${(bytes / 1024).toFixed(0)} KB`;
const size = jsBytes(DIST);
const { jsBytes: budget } = JSON.parse(readFileSync(BUDGET_FILE, "utf8"));

console.log(`Web JS: ${kb(size)} (${size} bytes). Budget: ${kb(budget)} (${budget} bytes).`);
if (size > budget) {
  console.error(`The web bundle is ${kb(size - budget)} over its budget.`);
  process.exit(1);
}
