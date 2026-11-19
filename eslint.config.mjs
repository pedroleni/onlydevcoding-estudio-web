import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import sonarjs from "eslint-plugin-sonarjs";

// Normas de clean code (docs/clean-code.md). Lo que el código anterior ya incumplía está
// congelado en eslint-suppressions.json: solo puede bajar (`npm run clean-code:podar`).
const cleanCode = {
  files: ["src/**/*.{ts,tsx}"],
  plugins: { sonarjs },
  linterOptions: { reportUnusedDisableDirectives: "error" },
  rules: {
    complexity: ["error", 15],
    "max-depth": ["error", 4],
    "max-params": ["error", 4],
    "max-nested-callbacks": ["error", 4],
    "max-lines-per-function": ["error", { max: 80, skipBlankLines: true, skipComments: true }],
    "max-lines": ["error", { max: 400, skipBlankLines: true, skipComments: true }],
    "no-nested-ternary": "error",
    "no-else-return": ["error", { allowElseIf: false }],
    "no-lonely-if": "error",
    "prefer-const": "error",
    "react/no-danger": "error",
    "react-hooks/exhaustive-deps": "error",
    "@typescript-eslint/consistent-type-imports": ["error", { fixStyle: "inline-type-imports", disallowTypeAnnotations: false }],
    "sonarjs/cognitive-complexity": ["error", 15],
    "sonarjs/no-identical-functions": "error",
    "sonarjs/no-all-duplicated-branches": "error",
    "sonarjs/no-identical-conditions": "error",
    "sonarjs/no-collapsible-if": "error",
    "sonarjs/no-redundant-jump": "error",
    "sonarjs/prefer-single-boolean-return": "error",
    "sonarjs/no-inverted-boolean-check": "error",
  },
};

// Los componentes llevan JSX: algo más de margen por función.
const componentes = {
  files: ["src/**/*.tsx"],
  rules: {
    "max-lines-per-function": ["error", { max: 150, skipBlankLines: true, skipComments: true }],
  },
};

// Los tests se leen como una lista de casos: sin límite de longitud, con describe/it anidados.
const tests = {
  files: ["src/**/*.test.{ts,tsx}"],
  rules: {
    "max-lines-per-function": "off",
    "max-lines": "off",
    "max-nested-callbacks": ["error", 6],
    "sonarjs/no-identical-functions": "off",
  },
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  cleanCode,
  componentes,
  tests,
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
