import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import boundaries from "eslint-plugin-boundaries";
import unicorn from "eslint-plugin-unicorn";
import eslintConfigPrettier from "eslint-config-prettier";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    plugins: { boundaries },
    settings: {
      "boundaries/include": ["src/**/*"],
      "boundaries/elements": [
        { type: "app", pattern: "src/app/**" },
        { type: "views", pattern: "src/views/**" },
        { type: "layout", pattern: "src/layout/**" },
        { type: "features", pattern: "src/features/**" },
        { type: "shared", pattern: "src/shared/**" },
      ],
    },
    rules: {
      "boundaries/dependencies": [
        "error",
        {
          default: "disallow",
          policies: [
            {
              from: { element: { type: "app" } },
              allow: [
                { to: { element: { type: "views" } } },
                { to: { element: { type: "layout" } } },
              ],
            },
            {
              from: { element: { type: "views" } },
              allow: [
                { to: { element: { type: "features" } } },
                { to: { element: { type: "shared" } } },
              ],
            },
            {
              from: { element: { type: "layout" } },
              allow: [{ to: { element: { type: "shared" } } }],
            },
            {
              // "features" is deliberately absent from its own allow-list —
              // this is what blocks feature-to-feature imports.
              from: { element: { type: "features" } },
              allow: [{ to: { element: { type: "shared" } } }],
            },
            {
              from: { element: { type: "shared" } },
              allow: [],
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: { unicorn },
    rules: {
      "unicorn/filename-case": ["error", { case: "kebabCase" }],
    },
  },
  eslintConfigPrettier,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
