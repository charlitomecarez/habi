import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

// Native adapters only wrap a phone API, so node cannot run them. The phone tests and the Maestro flows cover them.
const NATIVE_ADAPTERS = [
  "alarm",
  "clipboard",
  "env",
  "google-sign-in",
  "health-connect",
  "location",
  "navigation",
  "push-notifications",
  "secure-screen",
  "statement-file",
  "supabase",
  "trip-pdf",
  "vault-backup",
  "vault-biometric",
  "vault-pin",
  "voice-audio",
  "widgets",
].map((name) => `lib/${name}.ts`);

// Unit tests for pure logic in lib/ (no React Native runtime). Screens are checked on the phone.
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
  test: {
    include: ["lib/**/*.test.ts", "widgets/**/*.test.ts", "supabase/functions/_shared/**/*.test.ts"],
    environment: "node",
    // This Mac has 8 GB of RAM, so the safe run is the default.
    maxWorkers: 1,
    // Vitest runs zustand through its own module graph, so a test's mock of react reaches the store hooks.
    server: { deps: { inline: ["zustand"] } },
    coverage: {
      provider: "v8",
      include: ["lib/**/*.ts", "supabase/functions/_shared/**/*.ts"],
      exclude: ["**/*.test.ts", "**/*.web.ts", "lib/test/**", ...NATIVE_ADAPTERS],
      reporter: ["text-summary", "json-summary"],
      thresholds: { lines: 80 },
    },
  },
});
