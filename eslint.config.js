import { defineConfig } from "eslint/config";

const eslintConfig = defineConfig([
  {
    ignores: [
      "**/node_modules/**",
      "**/.next/**",
      "**/out/**",
      "**/build/**",
      "**/dist/**",
      "**/target/**",
      "**/.git/**",
    ],
  },
]);

export default eslintConfig;
