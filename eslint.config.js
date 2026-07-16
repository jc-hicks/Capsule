import globals from "globals";
import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import prettier from "eslint-plugin-prettier";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";

export default [
  {
    ignores: ["frontend/dist/**", "node_modules/**", "coverage/**"]
  },
  {
    files: ["**/*.{js,jsx,mjs,cjs,ts,tsx}"],

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
    plugins: {
      prettier: prettier
    },

    rules: {
      // ESLint recommended rules
      ...js.configs.recommended.rules,

      indent: [
        "error",
        2,
        {
          SwitchCase: 1
        }
      ],

      "no-unused-vars": ["error", { ignoreRestSiblings: true }],
      "linebreak-style": ["error", "unix"],
      quotes: ["error", "double"],
      semi: ["error", "always"],
      "no-console": 0,

      // Prettier integration - this runs Prettier through ESLint.
      // Options intentionally omitted so the rule reads .prettierrc, keeping
      // `npm run lint` and `npm run format` from fighting over formatting.
      "prettier/prettier": "error"
    }
  },
  {
    files: ["frontend/src/**/*.{js,jsx}"],
    plugins: {
      react,
      "react-hooks": reactHooks
    },
    settings: {
      react: { version: "detect" }
    },
    rules: {
      ...react.configs.flat.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      // The new JSX transform makes the React import unnecessary.
      "react/react-in-jsx-scope": "off"
    }
  },
  eslintConfigPrettier
];
