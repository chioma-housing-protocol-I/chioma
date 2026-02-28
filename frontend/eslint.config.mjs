import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Allow Node-style require imports in the alt-text verification script.
  {
    files: ['scripts/verify-alt-text.js'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  // Enforce descriptive alt text on all images (including Next.js Image).
  {
    files: ['**/*.tsx', '**/*.jsx'],
    rules: {
      'jsx-a11y/alt-text': [
        'error',
        {
          elements: ['img'],
          img: ['Image'],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
  ]),
]);

export default eslintConfig;
