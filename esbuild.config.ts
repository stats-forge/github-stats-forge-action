import { build } from 'esbuild';

await build({
  entryPoints: ['src/index.ts'],
  outfile: 'dist/index.js',
  bundle: true,
  platform: 'node',
  target: 'node24',
  format: 'esm',
  // Bundled dependencies still call `require`, which ESM does not define.
  banner: {
    js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
  },
  // Drops the comments the dependencies bring along.
  minifyWhitespace: true,
  // Without it, `minifyWhitespace` collapses the bundle into a few enormous lines.
  lineLimit: 200,
});
