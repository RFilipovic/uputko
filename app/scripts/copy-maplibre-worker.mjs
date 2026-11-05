// MapLibre v6 runs its tile parsing in a module worker that the Next.js bundler
// does not emit. Serve the worker (and the shared chunk it imports) from /public.
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const dist = dirname(require.resolve("maplibre-gl/package.json")) + "/dist";
const out = join(process.cwd(), "public", "maplibre");
mkdirSync(out, { recursive: true });
for (const f of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"])
  copyFileSync(join(dist, f), join(out, f));
console.log("maplibre worker copied to public/maplibre");
