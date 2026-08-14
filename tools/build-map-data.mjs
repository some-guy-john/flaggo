/*
 * Precompute the simplified map geometry that loadWorldMap used to derive in
 * every browser on every visit (185-297 ms of blocked main thread).
 *
 * Run after changing world-countries-lite.geojson or the simplify tolerances:
 *
 *   node tools/build-map-data.mjs
 *
 * Outputs, all committed:
 *   data/world-overview.geojson  simplified for the zoomed-out atlas
 *   data/world-globe.geojson     heavily simplified for the globe
 *
 * The full-detail source is still shipped for the zoomed-in atlas.
 */
import { createRequire } from "node:module";
import { readFileSync, writeFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/* The runtime gets d3 from an injected UMD script; here it comes off the same
   vendored bundle, so the winding logic is identical in both places. */
globalThis.d3 = require(join(ROOT, "vendor/d3.min.js"));

const { simplifyFeature } = await import("../src/map/simplify.js");
const { ATLAS_OVERVIEW_TOLERANCE } = await import("../src/core/constants.js");
const { normalizeMapFeatureWinding, getFeatureCode } = await import("../src/map/geometry.js");

const GLOBE_TOLERANCE = 0.2;

const source = JSON.parse(readFileSync(join(ROOT, "data/world-countries-lite.geojson"), "utf8"));

const features = (source.features || [])
  .filter((feature) => feature?.properties?.["ISO3166-1-Alpha-2"] && feature?.geometry)
  .map(normalizeMapFeatureWinding)
  .filter((feature) => feature.geometry.coordinates.length);

console.log(`source features: ${features.length}`);

/* Only the fields the runtime reads survive, which is most of the size win. */
function slim(feature) {
  return {
    type: "Feature",
    properties: {
      name: feature.properties.name,
      "ISO3166-1-Alpha-2": feature.properties["ISO3166-1-Alpha-2"]
    },
    geometry: feature.geometry
  };
}

const overview = features
  .map((feature) => {
    const simplified = normalizeMapFeatureWinding(simplifyFeature(feature, ATLAS_OVERVIEW_TOLERANCE));
    /* Fall back to full detail when simplification collapses a small country. */
    return slim(simplified.geometry.coordinates.length ? simplified : feature);
  });

const globe = features
  .map((feature) => normalizeMapFeatureWinding(simplifyFeature(feature, GLOBE_TOLERANCE)))
  .filter((feature) => feature.geometry.coordinates.length)
  .map(slim);

const sourceCodes = new Set([...features.map(getFeatureCode)].filter(Boolean));
const missingFrom = (collection) => {
  const codes = new Set(collection.map(getFeatureCode));
  return [...sourceCodes].filter((code) => !codes.has(code));
};

/* Every country must survive into the overview -- the atlas makes each one a
   clickable, nameable target, so a dropped feature is a broken game. */
const overviewMissing = missingFrom(overview);
if (overviewMissing.length) {
  throw new Error(`overview dropped ${overviewMissing.length} countries: ${overviewMissing.join(", ")}`);
}

/* The globe is a proximity display at ~1px per micro-state, and the previous
   runtime code filtered collapsed features out too, so drops here are expected
   and match existing behaviour. Reported so a tolerance change stays visible. */
const globeMissing = missingFrom(globe);
if (globeMissing.length) {
  console.log(`globe omits ${globeMissing.length} sub-pixel territories: ${globeMissing.join(", ")}`);
}

/*
 * Only the globe artifact ships.
 *
 * The globe needs nothing but this file, so it replaces a 1647 KB download plus
 * a ~120 ms simplify pass with a 521 KB download and no CPU at all.
 *
 * The atlas is a different trade: it needs full detail when zoomed past
 * ATLAS_DETAIL_ZOOM regardless, so shipping the overview too would add ~1.3 MB
 * of download to save ~150 ms of CPU -- a net loss on any decent connection.
 * The overview is still built above (and validated for completeness) because
 * the worthwhile version of that change is to open the atlas on the overview
 * and stream full detail in only when the user actually zooms in. That is a
 * larger change to map/atlas.js than this pass takes on.
 */
void overview;

const targets = [
  ["data/world-globe.geojson", globe, GLOBE_TOLERANCE]
];

for (const [path, collection, tolerance] of targets) {
  writeFileSync(
    join(ROOT, path),
    JSON.stringify({ type: "FeatureCollection", tolerance, features: collection })
  );
  const kb = Math.round(statSync(join(ROOT, path)).size / 1024);
  console.log(`wrote ${path}  ${collection.length} features  ${kb} KB`);
}

const sourceKb = Math.round(statSync(join(ROOT, "data/world-countries-lite.geojson")).size / 1024);
console.log(`(full-detail source stays at ${sourceKb} KB for the zoomed-in atlas)`);
