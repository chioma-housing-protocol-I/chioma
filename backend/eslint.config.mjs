// @ts-check
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default tseslint.config(
  {
    ignores: [
      'eslint.config.mjs',
      'node_modules/',
      'dist/',
      'build/',
      '.next/',
      'coverage/',
      '*.js',
      '*.json',
      'scripts/',
      // These files are missing class declarations in upstream — pre-existing parse errors
      'src/modules/users/users.controller.ts',
      'src/modules/users/users.service.ts',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  {
    files: ['src/**/*.ts'],
    ignores: ['**/*.spec.ts', '**/*.e2e-spec.ts', '**/__tests__/**'],
    rules: {
      'no-console': 'error',
      'no-restricted-syntax': [
        'error',
        {
          selector: 'TSAsExpression > TSAnyKeyword',
          message:
            "Do not use 'as any'. Use a proper type, a validated parse, or a documented narrow type with a runtime guard instead.",
        },
        {
          selector: 'TSTypeAssertion > TSAnyKeyword',
          message:
            "Do not use '<any>' type assertions. Use a proper type, a validated parse, or a documented narrow type with a runtime guard instead.",
        },
      ],
    },
  },
);
