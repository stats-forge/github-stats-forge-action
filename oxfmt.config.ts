import { oxfmtConfig } from '@marcalexiei/oxfmt-config';
import { defineConfig } from 'oxfmt';

export default defineConfig({
  ...oxfmtConfig,
  ignorePatterns: [
    // The committed bundle: generated, and 1.1mb of it.
    // `.gitignore` cannot hold it, because the action runs `dist/` from the repo.
    'dist',
    // Written by release-please on every release.
    // Reformatting it only fights whatever it generates next.
    'CHANGELOG.md',
  ],
});
