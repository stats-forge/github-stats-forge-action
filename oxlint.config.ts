import { baseConfig, disableMaxStatementsConfig } from '@marcalexiei/oxlint-config/base';
import { typescriptConfig } from '@marcalexiei/oxlint-config/typescript';
import { vitestConfig } from '@marcalexiei/oxlint-config/vitest';
import { defineConfig } from 'oxlint';

export default defineConfig({
  env: { node: true },
  extends: [baseConfig, typescriptConfig],
  // `typescriptConfig` holds rules that need types, which oxlint-tsgolint reads.
  options: { typeAware: true },
  // The committed bundle: generated, and 1.1mb of it.
  ignorePatterns: ['dist'],
  overrides: [
    {
      files: ['**/*.spec.ts'],
      ...vitestConfig,
      // A `describe` body counts as one function, which no suite fits inside.
      rules: { ...vitestConfig.rules, ...disableMaxStatementsConfig.rules },
    },
  ],
});
