import {dirname} from "path";
import {fileURLToPath} from "url";

import {FlatCompat} from "@eslint/eslintrc";
import checkFile from "eslint-plugin-check-file";
import importPlugin from "eslint-plugin-import";
import reactPlugin from "eslint-plugin-react";
import tseslint from "typescript-eslint";

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
      "check-file": checkFile,
      import: importPlugin,
    },
    rules: {
      // Enforce type imports on separate lines
      "@typescript-eslint/consistent-type-imports": [
        "error",
        {
          prefer: "type-imports",
          disallowTypeAnnotations: true,
          fixStyle: "separate-type-imports",
        },
      ],

      // Enforce import order
      "import/order": [
        "error",
        {
          groups: [
            "builtin",   // Node.js built-in modules
            "external",  // Third-party packages
            "internal",  // Project-level imports (@sigil/...)
            "parent",    // Parent imports (../)
            "sibling",   // Sibling imports (./)
            "index",     // Index imports
            "object",    // Object imports (CSS and other side-effect imports)
          ],
          pathGroups: [
            {
              pattern: "**/*.css",
              group: "object",
              position: "after",
            },
            {
              pattern: "@sigil/**",
              group: "internal",
              position: "after",
            },
            {
              pattern: "../../../../../../../**",
              group: "parent",
              position: "before",
            },
            {
              pattern: "../../../../../../**",
              group: "parent",
              position: "before",
            },
            {
              pattern: "../../../../../**",
              group: "parent",
              position: "before",
            },
            {
              pattern: "../../../../**",
              group: "parent",
              position: "before",
            },
            {
              pattern: "../../../**",
              group: "parent",
              position: "before",
            },
            {
              pattern: "../../**",
              group: "parent",
              position: "before",
            },
            {
              pattern: "../**",
              group: "parent",
              position: "before",
            },
          ],
          pathGroupsExcludedImportTypes: ["builtin"],
          "newlines-between": "always",
          alphabetize: {
            order: "asc",
            caseInsensitive: true,
          },
          warnOnUnassignedImports: true,
        },
      ],
      // Enforce fat arrow syntax for all functions
      "prefer-arrow-callback": ["error", {allowNamedFunctions: false}],

      // Require curly braces for all control statements (no single-line if statements)
      "curly": ["error", "all"],

      // Ban nested ternary operators
      "no-nested-ternary": "error",

      // No spaces inside curly braces for destructuring and imports
      "object-curly-spacing": ["error", "never"],

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
          message: "Import React utilities directly instead of using React.* namespace (e.g., import {useState } from 'react')",
        },
        // Ban inline interface definitions - require separate interface declarations
        {
          selector: "VariableDeclarator[init.typeAnnotation.typeAnnotation.type='TSTypeLiteral']",
          message: "Define interfaces separately instead of using inline type literals. Create a named interface above the variable declaration.",
        },
        {
          selector: "FunctionDeclaration > :matches(TSTypeParameterDeclaration, TSTypeAnnotation) TSTypeLiteral",
          message: "Define interfaces separately instead of using inline type literals in function signatures.",
        },
        {
          selector: "ArrowFunctionExpression > :matches(TSTypeParameterDeclaration, TSTypeAnnotation) TSTypeLiteral",
          message: "Define interfaces separately instead of using inline type literals in function signatures.",
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

      // File naming conventions
      "check-file/filename-naming-convention": [
        "error",
        {
          // All TypeScript files default to camelCase
          "**/*.ts": "CAMEL_CASE",

          // Fixture files: camelCase
          "**/*.fixtures.tsx": "CAMEL_CASE",

          // Component tests: PascalCase
          "**/*.spec.tsx": "PASCAL_CASE",

          // React components in specific directories: PascalCase
          "src/ui/components/**/*.tsx": "PASCAL_CASE",
          "renderer/react/components/**/*.tsx": "PASCAL_CASE",
          "app/**/components/**/*.tsx": "PASCAL_CASE",

          // shadcn/ui primitives: kebab-case
          "src/ui/primitives/**/*.tsx": "KEBAB_CASE",

          // Render utilities: camelCase (functions, not components)
          "renderer/**/render/**/*.tsx": "CAMEL_CASE",

          // Next.js app directory special files: lowercase
          "app/**/page.tsx": "FLAT_CASE",
          "app/**/layout.tsx": "FLAT_CASE",
          "app/**/loading.tsx": "FLAT_CASE",
          "app/**/error.tsx": "FLAT_CASE",
          "app/**/not-found.tsx": "FLAT_CASE",
          "app/**/template.tsx": "FLAT_CASE",
        },
        {
          // Ignore Next.js special files - they must stay lowercase
          ignoreMiddleExtensions: true,
        },
      ],
    },
  },
];

export default eslintConfig;
