import { countries, normalize } from "../core/catalog.js";
import { ATLAS_OVERVIEW_TOLERANCE, COUNTRY_REGION_BY_CODE, MAP_FEATURE_CODE_OVERRIDES } from "../core/constants.js";
import { state } from "../core/state.js";
import { simplifyFeature } from "./simplify.js";
import { getFeatureCode, normalizeMapFeatureWinding } from "./geometry.js";

export { getFeatureCode, normalizeMapFeatureWinding };

export function loadAtlasCountries() {
  state.atlasCountries = countries.map((country) => {
    const region = COUNTRY_REGION_BY_CODE.get(country.code);

    if (!region) {
      throw new Error(`Atlas region is missing for ${country.name}.`);
    }

    return {
      ...country,
      id: country.code,
      kind: "countries",
      region
    };
  });
}

async function fetchJson(path, label) {
  const response = await fetch(path);

  if (!response.ok) {
    throw new Error(`Failed to load ${label}: ${response.status}`);
  }

  return response.json();
}

/*
 * The globe reads a geometry set precomputed by tools/build-map-data.mjs, so it
 * no longer downloads the 1647 KB full-detail map or runs the simplify pass to
 * derive its own copy. Sub-pixel territories are absent from that file for the
 * same reason the old runtime filter removed them.
 */
export async function loadGlobeMap() {
  const payload = await fetchJson("./data/world-globe.geojson", "globe map");

  state.globeFeatures = payload.features || [];
}

/*
 * The atlas still derives its overview at runtime: it needs full detail once
 * the player zooms past ATLAS_DETAIL_ZOOM regardless, so shipping a second
 * precomputed file would add more download than the simplify pass costs.
 */
export async function loadAtlasMap() {
  const payload = await fetchJson("./data/world-countries-lite.geojson", "world map");

  const mapFeatures = (payload.features || [])
    .filter((feature) => feature?.properties?.["ISO3166-1-Alpha-2"] && feature?.geometry)
    .map(normalizeMapFeatureWinding);

  state.atlasFeatures = mapFeatures.filter((feature) => feature.geometry.coordinates.length);
  state.atlasFeatureByCode = new Map(
    state.atlasFeatures.map((feature) => [getFeatureCode(feature), feature])
  );
  state.atlasOverviewFeatureByCode = new Map(
    state.atlasFeatures.map((feature) => {
      const overviewFeature = normalizeMapFeatureWinding(simplifyFeature(feature, ATLAS_OVERVIEW_TOLERANCE));
      return [getFeatureCode(feature), overviewFeature.geometry.coordinates.length ? overviewFeature : feature];
    })
  );
}

export async function loadMarineAreas() {
  const response = await fetch("./data/marine-areas.geojson");

  if (!response.ok) {
    throw new Error(`Failed to load marine areas: ${response.status}`);
  }

  const payload = await response.json();
  const featureByName = new Map();

  (payload.features || []).forEach((feature) => {
    const name = feature?.properties?.name_en || feature?.properties?.name;
    if (!name || !feature?.geometry) {
      return;
    }

    const key = normalize(name);
    const matches = featureByName.get(key) || [];
    matches.push(feature);
    featureByName.set(key, matches);
  });

  state.marineFeatureByName = featureByName;
}
