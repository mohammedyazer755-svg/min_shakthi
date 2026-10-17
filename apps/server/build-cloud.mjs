import { build } from 'esbuild';

// A single CommonJS handler avoids ESM metadata being lost by the hosted builder.
await build({
  entryPoints:['src/cloud-api.mts'],
  outfile:'dist/cloud-api.cjs',
  bundle:true,
  platform:'node',
  format:'cjs',
  target:'node24',
  external:['pg-native'],
  sourcemap:true,
  footer:{ js:'module.exports = module.exports.default;' },
});
