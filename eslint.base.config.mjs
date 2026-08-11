import js from '@eslint/js';
import nx from '@nx/eslint-plugin';
import vitest from '@vitest/eslint-plugin';
import importX from 'eslint-plugin-import-x';
import jestDom from 'eslint-plugin-jest-dom';
import prettierRecommended from 'eslint-plugin-prettier/recommended';
import testingLibrary from 'eslint-plugin-testing-library';
import globals from 'globals';
import * as jsoncParser from 'jsonc-eslint-parser';
import tseslint from 'typescript-eslint';

/**
 * Shared ESLint configuration for the workspace.
 *
 * Nx runs `eslint .` per project, so each project's `eslint.config.mjs` is the
 * only config ESLint loads for that run — flat config has no cascade. Every
 * project config therefore starts by spreading `baseConfig`.
 *
 * The frontend and server layers live here rather than in separate files so
 * that Nx tracks a single file as a lint cache input. Adding another root
 * config file would mean it is not matched by Nx's eslint config glob, and so
 * changes to it would not invalidate the lint cache.
 *
 * Beware: cwd differs between the two ways Nx runs ESLint, and flat-config
 * `files`/`ignores` patterns resolve against cwd. The `@nx/eslint:lint`
 * executor (most projects) runs from the workspace root, while inferred targets
 * (react-ui, ui-components, ui-kit) run from the project root. Prefer patterns
 * that begin with a globstar, which behave the same either way.
 */

const TS_JS_FILES = ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'];

/**
 * Replaces the former root `.eslintignore`.
 */
const ignores = [
  '**/node_modules/**',
  '**/dist/**',
  '**/.nx/**',
  '**/cache/**',
  'deploy/**',
  'dev/**',
  '.vscode/**',
  // Carried over from `.eslintignore`. That entry had no leading slash, so it
  // matched every package.json in the tree, which is what keeps
  // `@nx/dependency-checks` inert in server/worker and server/shared.
  // Preserved deliberately — enabling that rule is a separate change.
  '**/package.json',
];

/**
 * Prettier must be the last entry in any composed config so that it wins over
 * the stylistic rules enabled by the plugin recommendations above it.
 */
const prettierLast = {
  ...prettierRecommended,
  files: [...TS_JS_FILES, '**/*.json'],
};

export const baseConfig = [
  { ignores },
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  {
    files: TS_JS_FILES,
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: [],
          depConstraints: [
            {
              sourceTag: '*',
              onlyDependOnLibsWithTags: ['*'],
            },
          ],
        },
      ],
      'no-restricted-imports': [
        'error',
        {
          patterns: ['lodash', 'lodash/*'],
        },
      ],
    },
  },
  {
    files: ['**/*.spec.ts', '**/*.spec.tsx', '**/*.spec.js', '**/*.spec.jsx'],
    languageOptions: {
      globals: { ...globals.jest },
    },
  },
  {
    // Only the parser is wired up; no JSON rules are enabled. `@nx/dependency-checks`
    // is configured in server/worker and server/shared but stays inert because
    // package.json is ignored above.
    files: ['**/*.json'],
    languageOptions: { parser: jsoncParser },
  },
  {
    settings: {
      'import/parsers': {
        '@typescript-eslint/parser': ['.ts', '.tsx'],
      },
      'import/resolver': {
        typescript: {
          project: ['tsconfig.json', 'package/tsconfig.json'],
        },
        node: {
          project: ['tsconfig.json', 'package/tsconfig.json'],
        },
      },
    },
  },
  prettierLast,
];

/**
 * Shared by react-ui, ui-components and ui-kit. `nx.configs['flat/react']`
 * supplies the import, react, react-hooks and jsx-a11y plugins, matching the
 * former `plugin:@nx/react`.
 */
export const frontendConfig = [
  ...nx.configs['flat/react'],
  {
    ...js.configs.recommended,
    files: ['**/*.ts', '**/*.tsx'],
  },
  // `js.configs.recommended` re-enables base rules that TypeScript already
  // covers (no-undef, no-unused-vars). Re-applying the typescript-eslint
  // recommended set turns them back off, which is what the eslintrc extends
  // order (eslint:recommended then plugin:@typescript-eslint/recommended) did.
  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: ['**/*.ts', '**/*.tsx'],
  })),
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
      },
    },
    settings: {
      react: { version: 'detect' },
      'import/ignore': ['@vitejs/plugin-react'],
      'import/resolver': {
        alias: {
          map: [['@', './src']],
          extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
        },
      },
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'classnames',
              message: 'Please use cn instead of classnames.',
            },
          ],
        },
      ],
      'import/no-cycle': 'off',
      'linebreak-style': ['error', 'unix'],
      'import/no-unresolved': 'off',
      'import/default': 'off',
      'import/no-named-as-default-member': 'off',
      'import/no-named-as-default': 'off',
      'react/react-in-jsx-scope': 'off',
      'jsx-a11y/anchor-is-valid': 'off',
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    ...testingLibrary.configs['flat/react'],
    files: ['**/*.ts', '**/*.tsx'],
  },
  {
    ...jestDom.configs['flat/recommended'],
    files: ['**/*.ts', '**/*.tsx'],
  },
  {
    ...vitest.configs.recommended,
    files: ['**/*.ts', '**/*.tsx'],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      // TODO: pre-existing conditional `expect` calls in data-driven tests, newly
      // reported after moving to @vitest/eslint-plugin. Fix the tests, then drop this.
      'vitest/no-conditional-expect': 'off',
    },
  },
  prettierLast,
];

/**
 * Shared by server/api and the packages that used to extend its config:
 * shared, engine, server/worker and server/shared.
 *
 * Type-aware rules need `parserOptions.project`, which is project-specific, so
 * each project supplies its own via `typeAwareParserOptions`.
 */
export const serverConfig = [
  {
    ...importX.flatConfigs.recommended,
    files: ['**/*.ts', '**/*.js'],
  },
  {
    // import-x v4 enables `named` in recommended, and it cannot see through
    // TypeScript type-only exports. The plugin's own typescript config turns it
    // off, matching how v0.5 behaved here.
    ...importX.flatConfigs.typescript,
    files: ['**/*.ts', '**/*.js'],
  },
  ...tseslint.configs.strict.map((config) => ({
    ...config,
    files: ['**/*.ts', '**/*.js'],
  })),
  {
    files: ['**/*.ts', '**/*.js'],
    settings: {
      'import-x/resolver': {
        typescript: {
          alwaysTryTypes: false,
        },
        node: true,
      },
    },
    rules: {
      'import-x/no-unresolved': 'off',
      'no-console': 'error',
      'object-shorthand': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': [
        'error',
        // v8 flipped this to false; kept true to preserve the previous behaviour.
        { considerDefaultExhaustiveForUnions: true },
      ],
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-redundant-type-constituents': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/adjacent-overload-signatures': 'error',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          varsIgnorePattern: '^_',
          argsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/explicit-function-return-type': 'warn',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'warn',
      'no-return-await': 'off',
      '@typescript-eslint/return-await': ['error', 'in-try-catch'],
      'default-case-last': 'error',
      'import-x/no-duplicates': 'error',
    },
  },
  {
    files: ['**/*.test.ts', '**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  prettierLast,
];

/**
 * Type-aware linting needs tsconfig paths resolved relative to the project, not
 * to the directory ESLint happens to run from: the Nx executor runs with the
 * workspace root as cwd, while inferred targets run with the project root.
 *
 * @param {string} tsconfigRootDir pass `import.meta.dirname`
 * @param {string[]} project tsconfig globs, relative to the project
 */
export const typeAwareParserOptions = (
  tsconfigRootDir,
  project = ['tsconfig.*?.json'],
) => ({
  files: ['**/*.ts', '**/*.js'],
  languageOptions: {
    parserOptions: { project, tsconfigRootDir },
  },
});

export default baseConfig;
