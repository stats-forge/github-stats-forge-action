import { oxfmtConfig } from '@marcalexiei/oxfmt-config';
import { defineConfig } from 'oxfmt';

export default defineConfig({
  ...oxfmtConfig,
  ignorePatterns: [
    // The committed bundle:
    // `.gitignore` cannot hold it, because the action runs `dist/` from the repo.
    'dist',
    // Written by release-please on every release (no option to format it).
    'CHANGELOG.md',
  ],
});
