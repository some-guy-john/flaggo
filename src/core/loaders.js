import { loadCentroids } from "./geo.js";
import { loadAtlasMap, loadGlobeMap, loadMarineAreas } from "../map/data.js";

/*
 * Deferred asset loading.
 *
 * `init()` used to await ~3.9 MB of geojson and schedules before the first flag
 * appeared, even though Flag, Capitals and Tricky need none of it. Each loader
 * here memoises its promise so the fetch happens once, on the first mode switch
 * that actually needs the data. A failed load clears the memo so a later attempt
 * can retry rather than being stuck with a rejected promise.
 */

function memoize(load) {
  let promise = null;

  return function ensure() {
    if (!promise) {
      promise = load().catch((error) => {
        promise = null;
        throw error;
      });
    }

    return promise;
  };
}

/* d3 is a classic UMD bundle (280 KB) used only by the globe and map renders. */
export const ensureD3 = memoize(
  () =>
    new Promise((resolve, reject) => {
      if (window.d3) {
        resolve(window.d3);
        return;
      }

      const script = document.createElement("script");
      script.src = "./vendor/d3.min.js";
      script.addEventListener("load", () => resolve(window.d3));
      script.addEventListener("error", () => reject(new Error("Failed to load d3.")));
      document.head.appendChild(script);
    })
);

/* Globe needs only the precomputed geometry plus centroids for distances. */
export const ensureGlobeData = memoize(async () => {
  await ensureD3();
  await Promise.all([loadCentroids(), loadGlobeMap()]);
});

export const ensureAtlasData = memoize(async () => {
  /* loadAtlasMap normalises winding with d3.geoArea, so d3 must land first. */
  await ensureD3();
  await Promise.all([loadCentroids(), loadAtlasMap()]);

  /* Marine areas only enrich the physical-geography atlas sets. Losing them
     should not block the map from opening. */
  try {
    await loadMarineAreas();
  } catch (error) {
    console.warn(error);
  }
});

let capitalHints = null;

export const ensureCapitalsData = memoize(async () => {
  const module = await import("../data/capitals.js");
  capitalHints = module.CAPITAL_HINTS;
  return capitalHints;
});

/* Null until ensureCapitalsData() resolves. Callers already guarded on the old
   `window.CAPITAL_HINTS` being present, so the shape of that check is unchanged. */
export function getCapitalHints() {
  return capitalHints;
}

const REQUIREMENTS = {
  globe: ensureGlobeData,
  atlas: ensureAtlasData,
  capitals: ensureCapitalsData
};

export function gameNeedsLoading(gameType) {
  return Boolean(REQUIREMENTS[gameType]);
}

export function ensureGameReady(gameType) {
  const ensure = REQUIREMENTS[gameType];

  return ensure ? ensure() : Promise.resolve();
}
