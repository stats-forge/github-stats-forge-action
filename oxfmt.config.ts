import { oxfmtConfig } from '@marcalexiei/oxfmt-config';
import { defineConfig } from 'oxfmt';

export default defineConfig({
  ...oxfmtConfig,
  ignorePatterns: [
    // Written by release-please on every release (no option to format it).
    'CHANGELOG.md',
  ],
});
