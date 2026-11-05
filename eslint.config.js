// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*", "android/*", ".expo/*"],
  },
  {
    // Screens: Android-only code lives behind name.ts + name.web.ts, and colours come from tokens.
    files: ["app/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "MemberExpression[object.name='Platform'][property.name='OS']",
          message: "Screens never branch on Platform.OS. Use a name.ts + name.web.ts adapter.",
        },
        {
          selector: "Literal[value=/#[0-9a-fA-F]{3,8}\\b/]",
          message: "Use a token class or lib/colors.ts, not a hex code.",
        },
        {
          selector: "TemplateElement[value.raw=/#[0-9a-fA-F]{3,8}\\b/]",
          message: "Use a token class or lib/colors.ts, not a hex code.",
        },
      ],
    },
  },
]);
