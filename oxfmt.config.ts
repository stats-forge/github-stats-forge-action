import { oxfmtConfig } from '@marcalexiei/oxfmt-config';
import { defineConfig } from 'oxfmt';

export default defineConfig({
  ...oxfmtConfig,
  // The committed esbuild bundle: generated, and 1.1mb of it. `.gitignore`
  // cannot hold it, because a bundled action runs `dist/` straight from the repo.
  ignorePatterns: ['dist'],
});
