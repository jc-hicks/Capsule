import globals from "globals";
import js from "@eslint/js";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import eslintConfigPrettier from "eslint-config-prettier";
import prettier from "eslint-plugin-prettier";

export default [
  {
    ignores: ["**/dist/**", "**/node_modules/**"]
  },
  {
    files: ["**/*.{js,jsx,mjs,cjs}"],

    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        }
      },

      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2025
      }
    },

    settings: {
      react: {
        version: "18"
      }
    },

    plugins: {
      react,
      "react-hooks": reactHooks,
      prettier
    },

    rules: {
      // ESLint recommended rules
      ...js.configs.recommended.rules,

      // React + hooks rules
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,

      // The new JSX transform doesn't require React in scope.
      "react/react-in-jsx-scope": "off",

      "no-console": 0,

      "no-unused-vars": ["error", { ignoreRestSiblings: true }],

      // Prettier integration - this runs Prettier through ESLint.
      "prettier/prettier": [
        "error",
        {
          endOfLine: "lf",
          trailingComma: "none",
          singleQuote: false
        }
      ]
    }
  },
  eslintConfigPrettier
];
