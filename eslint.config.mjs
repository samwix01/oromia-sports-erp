// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/dist/**', '**/.next/**', '**/node_modules/**', 'tools/__fixtures__/**', '**/*.d.ts'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-restricted-syntax': [
        'error',
        { selector: "TSTypeReference[typeName.name='Float']", message: 'Money must use numeric strings, never floats.' },
      ],
    },
  },
  {
    // CLAUDE.md: all user-visible strings go through i18n keys.
    files: ['apps/web/src/**/*.tsx', 'apps/public-portal/src/**/*.tsx', 'packages/ui/src/**/*.tsx'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'JSXText[value=/[A-Za-z\\u1200-\\u137F]{2,}/]',
          message: 'Hard-coded UI text. Use an i18n key (useTranslations) instead.',
        },
      ],
    },
  },
);
