import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "coverage", "public", "supabase/**"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      "react-hooks/exhaustive-deps": "warn",
      // Base rules adjusted for TS projects
      "no-console": ["warn", { allow: ["warn", "error", "info", "debug"] }],
      "no-undef": "off",
      "no-unused-vars": "off",
      "no-unused-expressions": "off",
      "no-redeclare": "off",
      // TypeScript-specific rules to reduce noise
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-unused-expressions": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/no-empty-function": "off",
      "@typescript-eslint/no-var-requires": "off",
      "@typescript-eslint/require-await": "off",
      "@typescript-eslint/no-floating-promises": "off",
      "@typescript-eslint/await-thenable": "off",
      "no-restricted-imports": ["warn", { patterns: ["@/components/ui/use-toast"] }],
    },
  },
  // Scope restricted syntax to src only
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "warn",
        {
          selector: "Literal[value=/supabase\\.co/]",
          message: "Do not hardcode Supabase URLs; use SUPABASE_CONFIG and helpers.",
        },
      ],
    },
  },
  // Test files: enable jest globals and relax console
  {
    files: ["**/*.test.{ts,tsx,js,jsx}", "**/__tests__/**/*.{ts,tsx,js,jsx}"],
    languageOptions: {
      globals: { ...globals.browser, ...globals.jest },
    },
    rules: {
      "no-console": "off",
      "react-hooks/exhaustive-deps": "off",
      "no-unused-expressions": "off",
      "@typescript-eslint/no-empty-function": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "no-restricted-syntax": "off",
    },
  },
  // Config files: node globals
  {
    files: [
      "*.config.{js,cjs,mjs,ts}",
      "vite.config.ts",
      "tailwind.config.ts",
      "jest.config.js",
      "eslint.config.js"
    ],
    languageOptions: {
      globals: globals.node,
    },
  }
);
