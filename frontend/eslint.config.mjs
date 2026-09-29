import coreWebVitals from 'eslint-config-next/core-web-vitals';
import typescriptConfig from 'eslint-config-next/typescript';

export default [
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'out/**',
      'coverage/**',
      'next-env.d.ts',
      'public/**',
    ],
  },
  ...coreWebVitals,
  ...typescriptConfig,
  {
    rules: {
      // React Compiler readiness rules (new in eslint-plugin-react-hooks v7).
      // Retrofitting the existing codebase against these is a separate,
      // deliberate effort — downgraded to warn so lint stays actionable
      // without blocking on a mass audit of effect/render purity.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/static-components': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/incompatible-library': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      '@typescript-eslint/no-explicit-any': 'error',
      'no-console': 'error',
    },
  },
  {
    // Test utilities, mocks, scripts, and demo code may use console output
    files: [
      '**/__tests__/**',
      'test/**',
      'mocks/**',
      'scripts/**',
      'app/modals-demo/**',
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-console': 'off',
    },
  },
  {
    // Plain CommonJS Node scripts run directly via `node`, not bundled —
    // require() is correct here, not a TS-import-style violation.
    files: ['scripts/**/*.js', 'scripts/**/*.mjs'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      'no-console': 'off',
    },
  },
  {
    files: ['lib/offline/**/*.ts'],
    rules: {
      'no-console': 'error',
    },
  },
  {
    // Mock data must stay in tests and mock infrastructure — never in shipped UI.
    files: ['app/**/*.{ts,tsx}', 'components/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/mocks', '**/mocks/**', '@/mocks', '@/mocks/**'],
              message:
                'Mock modules must not be imported from app/ or components/. Use real API clients or keep mocks in tests.',
            },
          ],
        },
      ],
    },
  },
];
