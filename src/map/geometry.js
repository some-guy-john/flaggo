import { MAP_FEATURE_CODE_OVERRIDES } from "../core/constants.js";

/*
 * Pure geometry helpers, deliberately free of DOM and state imports so that
 * tools/build-map-data.mjs can run the exact same code under Node. Anything
 * added here must stay importable outside a browser.
 *
 * d3 is read off the global rather than imported: in the browser it arrives as
 * a UMD script injected by core/loaders.js, and the build tool assigns it to
 * globalThis before importing this module.
 */

export function normalizeMapFeatureWinding(feature) {
  const d3 = globalThis.d3;

  if (typeof d3 === "undefined") {
    return feature;
  }

  const reverseRing = (ring) => [...ring].reverse();
  const normalizePolygon = (polygon) => {
    const polygonArea = d3.geoArea({ type: "Polygon", coordinates: polygon });
    return polygonArea > Math.PI * 2 ? polygon.map(reverseRing) : polygon;
  };
  const coordinates = feature.geometry.type === "Polygon"
    ? normalizePolygon(feature.geometry.coordinates)
    : feature.geometry.type === "MultiPolygon"
      ? feature.geometry.coordinates.map(normalizePolygon)
      : feature.geometry.coordinates;

  return {
    ...feature,
    geometry: {
      ...feature.geometry,
      coordinates
    }
  };
}

export function getFeatureCode(feature) {
  const override = MAP_FEATURE_CODE_OVERRIDES.get(feature?.properties?.name);
  if (override) {
    return override;
  }

  const rawCode = feature?.properties?.["ISO3166-1-Alpha-2"]?.toLowerCase();
  if (rawCode && rawCode !== "-99") {
    return rawCode;
  }

  return null;
}
