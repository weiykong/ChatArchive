import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist/**", "node_modules/**", "coverage/**", "artifacts/**", ".tools/**", ".claude/**", "*.js", "scripts/**", "tests/**", "src/content/**", "src/popup/**", "src/print/**", "src/background/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.ts", "tests/**/*.ts", "e2e/**/*.ts"],
    languageOptions: { globals: { ...globals.browser, chrome: "readonly" } },
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }]
    }
  },
  {
    // Legacy IIFE content scripts and popup: plain browser JS.
    files: ["src/content/*.js", "src/popup/*.js", "src/print/*.js", "src/background/*.js"],
    languageOptions: { sourceType: "script", globals: { ...globals.browser, chrome: "readonly" } },
    rules: { "no-unused-vars": ["warn", { args: "none" }] }
  },
  {
    files: ["src/popup/*.js"],
    languageOptions: { sourceType: "module" }
  },
  {
    files: ["scripts/**/*.{js,mjs}", "tests/**/*.js", "*.config.{js,mjs,ts}"],
    languageOptions: { globals: { ...globals.node } }
  },
  {
    files: ["**/*.js"],
    ignores: ["src/**"],
    languageOptions: { sourceType: "commonjs" }
  }
);
