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
    },
  },
  {
    // Test utilities and mock setups may use unknown or explicit any with justification
    files: ['**/__tests__/**', 'test/**'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  {
    // Plain CommonJS Node scripts run directly via `node`, not bundled —
    // require() is correct here, not a TS-import-style violation.
    files: ['scripts/**/*.js'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
];
