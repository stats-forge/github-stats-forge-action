// The entry point `action.yml` runs, as the esbuild bundle `dist/index.js`.
// Everything it does lives in `action.ts`, so a test can import the pieces
// without importing this file and running the action as a side effect.
import { setFailed } from '@actions/core';

import { run } from './action.js';

try {
  await run();
} catch (error) {
  setFailed(error instanceof Error ? error.message : String(error));
}
