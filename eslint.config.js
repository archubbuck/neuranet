// @ts-check
const eslint = require('@eslint/js');
const { defineConfig } = require('eslint/config');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');

module.exports = defineConfig([
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
      tseslint.configs.stylistic,
      angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'app',
          style: 'camelCase',
        },
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: 'app',
          style: 'kebab-case',
        },
      ],
    },
  },
  {
    files: ['**/*.html'],
    extends: [angular.configs.templateRecommended, angular.configs.templateAccessibility],
    rules: {
      // `x != null` is the idiomatic null-or-undefined check.
      '@angular-eslint/template/eqeqeq': ['error', { allowNullOrUndefined: true }],
    },
  },

  // Specs frequently reach into protected members via `as any`; that is an
  // accepted testing idiom here.
  {
    files: ['**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },

  // ── Architectural governance ──────────────────────────────────
  // Layer rules: ui/ is presentational (no app-state or HTTP imports);
  // data/ is the bottom layer (no imports from feature/UI layers).
  {
    files: ['src/app/ui/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/data/*', '**/screens/*', '**/shell/*'],
              message:
                'ui/ components must stay presentational: no imports from data/, screens/, or shell/. Pass data via inputs/outputs.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/app/data/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/screens/*', '**/ui/*', '**/shell/*'],
              message: 'data/ is the bottom layer: it must not import from screens/, ui/, or shell/.',
            },
          ],
        },
      ],
    },
  },
  // God-component guard: cap file growth (tighten over time as screens
  // are decomposed further).
  {
    files: ['src/app/**/*.component.ts'],
    rules: {
      'max-lines': ['error', { max: 1250, skipBlankLines: true, skipComments: true }],
    },
  },
  // Legacy oversized screens — explicitly enumerated with a frozen ceiling
  // so they cannot grow. New components must respect the 1250 cap above;
  // decomposing these three shrinks this list.
  {
    files: [
      'src/app/screens/categories/categories-screen.component.ts',
      'src/app/screens/topics/topics-screen.component.ts',
      'src/app/screens/sources/sources-screen.component.ts',
    ],
    rules: {
      'max-lines': ['error', { max: 1800, skipBlankLines: true, skipComments: true }],
    },
  },

  // ── Backend (CommonJS, Node) ─────────────────────────────────
  {
    files: ['server/**/*.js', 'scripts/**/*.mjs'],
    extends: [eslint.configs.recommended],
    languageOptions: {
      sourceType: 'commonjs',
      globals: {
        require: 'readonly',
        module: 'writable',
        process: 'readonly',
        console: 'readonly',
        __dirname: 'readonly',
        fetch: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        setTimeout: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrors: 'none' }],
    },
  },
  {
    files: ['scripts/**/*.mjs', 'server/**/*.mjs'],
    languageOptions: { sourceType: 'module' },
  },
]);
