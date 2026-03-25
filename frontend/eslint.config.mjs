import expo from "eslint-config-expo/flat.js";

export default [
  ...expo,
  {
    ignores: [
      "node_modules/",
      ".expo/",
      "dist/",
      "web/dist/",
      "web-build/",
      "coverage/",
      "**/*.config.js",
      "**/*.config.ts",
    ],
  },
  {
    files: ["**/__tests__/**/*.{ts,tsx}", "**/*.test.{ts,tsx}"],
    rules: {
      "import/first": "off",
      "@typescript-eslint/array-type": "off",
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  {
    files: ["__mocks__/**/*.js"],
    languageOptions: {
      globals: {
        jest: "readonly",
      },
    },
  },
  {
    files: ["web/**/*.config.js"],
    rules: {
      "import/no-named-as-default": "off",
    },
  },
];
