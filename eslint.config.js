import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "coverage", "public", "supabase/**"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
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
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-unused-expressions": "off",
      "no-console": ["warn", { allow: ["warn", "error", "info", "debug"] }],
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
