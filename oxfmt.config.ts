import { oxfmtConfig } from '@marcalexiei/oxfmt-config';
import { defineConfig } from 'oxfmt';

export default defineConfig({
  ...oxfmtConfig,
  // The committed bundle: generated, and 1.1mb of it.
  // `.gitignore` cannot hold it, because the action runs `dist/` from the repo.
  ignorePatterns: ['dist'],
});
