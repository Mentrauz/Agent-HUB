import nextConfig from "eslint-config-next";

const eslintConfig = [
  ...nextConfig,
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
    ],
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      // The codebase deliberately uses `any` in a few typed-boundary spots
      // (Prisma JSON casts, test fakes). Keep the rule on but allow explicit
      // escapes so refactors stay visible instead of hidden.
      "@typescript-eslint/no-explicit-any": "warn",

      // Next's App Router dynamic segments use Promise-wrapped params in 15.
      // The `await params` pattern is intentional and type-safe.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],

      // React 19 + Next 16: react-hooks compiler rules
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/incompatible-library": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/static-components": "warn",
      "react/react-in-jsx-scope": "off",

      // Hyphenated/underscore file names (page.tsx, route.ts) are standard.
      "import/no-anonymous-default-export": "off",

      // The app's terminal/pixel design language renders `// LABEL` comment
      // text and quoted copy as visible UI. These are intentional text nodes,
      // not stray comments.
      "react/jsx-no-comment-textnodes": "off",
      "react/no-unescaped-entities": "off",

      // Prisma JSON columns are cast through `{}`/object at repo boundaries
      // (the generated types don't expose a JSON literal type). Intentional.
      "@typescript-eslint/no-empty-object-type": "off",
    },
  },
  {
    files: ["tests/**", "scripts/**"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
];

export default eslintConfig;
