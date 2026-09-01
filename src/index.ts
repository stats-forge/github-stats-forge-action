// The entry point `action.yml` runs, as the bundle `dist/index.js`.
// The work lives in `action.ts`, so a test can import it without running the
// action as a side effect.
import { setFailed } from '@actions/core';

import { run } from './action.js';

try {
  await run();
} catch (error) {
  setFailed(error instanceof Error ? error.message : String(error));
}
