import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import tseslint from "typescript-eslint";
import reactPlugin from "eslint-plugin-react";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  ...tseslint.configs.recommended,
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
  {
    plugins: {
      react: reactPlugin,
    },
    rules: {
      // Enforce fat arrow syntax for all functions
      "prefer-arrow-callback": ["error", { allowNamedFunctions: false }],

      // TypeScript-specific rules
      "@typescript-eslint/method-signature-style": ["error", "property"],
      "@typescript-eslint/consistent-type-definitions": ["error", "interface"],

      // Ban function declarations - require arrow functions via const
      "no-restricted-syntax": [
        "error",
        // Ban React.FC and similar types
        {
          selector: "TSTypeReference[typeName.name='FC']",
          message: "Use explicit prop typing instead of FC. Destructure props with explicit type annotation.",
        },
        {
          selector: "TSTypeReference[typeName.name='FunctionComponent']",
          message: "Use explicit prop typing instead of FunctionComponent. Destructure props with explicit type annotation.",
        },
        {
          selector: "TSTypeReference[typeName.property.name='FC']",
          message: "Use explicit prop typing instead of React.FC. Destructure props with explicit type annotation.",
        },
        {
          selector: "TSTypeReference[typeName.property.name='FunctionComponent']",
          message: "Use explicit prop typing instead of React.FunctionComponent. Destructure props with explicit type annotation.",
        },
        // Ban function declarations - require arrow functions
        {
          selector: "FunctionDeclaration",
          message: "Use const with arrow function instead of function declaration (e.g., const myFunc = () => {})",
        },
        {
          selector: "ExportNamedDeclaration > FunctionDeclaration",
          message: "Use export const with arrow function instead of export function (e.g., export const myFunc = () => {})",
        },
        {
          selector: "ExportDefaultDeclaration > FunctionDeclaration",
          message: "Use const with arrow function and export default separately, or use a named export instead",
        },
        // Ban React.* namespace usage - require named imports
        {
          selector: "MemberExpression[object.name='React']",
          message: "Import React utilities directly instead of using React.* namespace (e.g., import { useState } from 'react')",
        },
      ],

      // Relax some strict TypeScript rules that might be too aggressive
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-explicit-any": "warn", // Warn instead of error
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
    },
  },
];

export default eslintConfig;
