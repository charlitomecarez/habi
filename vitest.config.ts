import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

// Unit tests for pure logic in lib/ (no React Native runtime). Screens are checked on the phone.
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
  test: {
    include: ["lib/**/*.test.ts", "supabase/functions/_shared/**/*.test.ts"],
    environment: "node",
    // This Mac has 8 GB of RAM, so the safe run is the default.
    maxWorkers: 1,
  },
});
