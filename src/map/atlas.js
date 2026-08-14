import { countries, normalize } from "../core/catalog.js";
import { ATLAS_DETAIL_ZOOM, ATLAS_PATH_CACHE_LIMIT, ATLAS_WATER_FALLBACK_AREAS, ATLAS_ZOOM_MAX } from "../core/constants.js";
import { clamp } from "../core/geo.js";
import { elements, state } from "../core/state.js";
import { isAtlasCountrySet, selectAtlasCountry } from "../games/atlas.js";
import { getFeatureCode } from "./data.js";

export function getAtlasCountryPlaceByCode(code) {
  return state.atlasQueue.find((place) => place.code === code) || null;
}

export function getAtlasMapHeading() {
  const labels = {
    world: "World map",
    africa: "Africa map",
    asia: "Asia map",
    europe: "Europe map",
    "north-america": "North America map",
    "south-america": "South America map",
    oceania: "Oceania map"
  };

  return labels[state.atlasSet] || "Country map";
}

export function getAtlasPhysicalTargetCodes(place) {
  if (!place || place.kind !== "continents") {
    return new Set();
  }

  if (place.id === "antarctica") {
    return new Set(["aq"]);
  }

  const region = place.id.replaceAll("_", "-");
  return new Set(
    state.atlasCountries
      .filter((country) => country.region === region)
      .map((country) => country.code)
  );
}

export function updateAtlasCountryMapStyles() {
  if (!elements.atlasMap || !state.atlasCountryPaths || typeof d3 === "undefined") {
    return;
  }

  const completedById = new Map(state.guesses.map((guess) => [guess.id, guess]));
  const activeCodes = new Set(state.atlasQueue.map((place) => place.code));
  state.atlasCountryPaths
    .classed("remaining", (feature) => {
      const code = getFeatureCode(feature);
      return state.atlasShowRemaining && activeCodes.has(code) && !completedById.has(code);
    })
    .classed("named", (feature) => completedById.get(getFeatureCode(feature))?.correct === true)
    .classed("revealed", (feature) => completedById.get(getFeatureCode(feature))?.correct === false)
    .classed("selected", (feature) => getFeatureCode(feature) === state.atlasSelectedCountryCode);

  if (state.atlasTinyCountryMarkers) {
    state.atlasTinyCountryMarkers
      .classed("is-visible", (feature) => {
        const code = getFeatureCode(feature);
        return state.atlasShowRemaining && activeCodes.has(code) && !completedById.has(code);
      })
      .classed("selected", (feature) => getFeatureCode(feature) === state.atlasSelectedCountryCode)
      .attr("tabindex", (feature) => {
        const code = getFeatureCode(feature);
        return state.atlasShowRemaining && activeCodes.has(code) && !completedById.has(code) ? 0 : -1;
      })
      .attr("aria-hidden", (feature) => {
        const code = getFeatureCode(feature);
        return String(!state.atlasShowRemaining || !activeCodes.has(code) || completedById.has(code));
      });
  }

  const namedCount = state.guesses.filter((guess) => guess.correct).length;
  const completedCount = state.guesses.length;
  elements.atlasPosition.textContent = `${completedCount} / ${state.atlasQueue.length} complete`;
  elements.atlasMapSelection.textContent = state.finished
    ? "Map complete"
    : state.atlasSelectedCountryCode
      ? "Country selected — reveal it only if you want the answer."
    : state.atlasShowRemaining
      ? "Countries still to find are highlighted"
      : namedCount
        ? `${namedCount} named · keep typing`
        : "Type country names to fill the map";
  elements.atlasShowRemainingButton.setAttribute("aria-pressed", String(state.atlasShowRemaining));
  elements.atlasShowRemainingButton.classList.toggle("is-active", state.atlasShowRemaining);
  elements.atlasRevealSelectedButton.disabled = !state.atlasSelectedCountryCode || state.finished;
  elements.giveUpButton.disabled = state.finished;
}

export function updateAtlasCountryMapEntry(code, guess) {
  const countryPath = state.atlasCountryPathByCode.get(code);
  if (countryPath) {
    countryPath.classList.remove("remaining", "named", "revealed", "selected");
    countryPath.classList.add(guess.correct ? "named" : "revealed");
  }

  const tinyMarker = state.atlasTinyMarkerByCode.get(code);
  if (tinyMarker) {
    tinyMarker.classList.remove("is-visible", "selected");
    tinyMarker.setAttribute("tabindex", "-1");
    tinyMarker.setAttribute("aria-hidden", "true");
  }

  const namedCount = state.guesses.filter((entry) => entry.correct).length;
  elements.atlasPosition.textContent = `${state.guesses.length} / ${state.atlasQueue.length} complete`;
  elements.atlasMapSelection.textContent = namedCount
    ? `${namedCount} named · keep typing`
    : "Type country names to fill the map";
  elements.atlasRevealSelectedButton.disabled = !state.atlasSelectedCountryCode || state.finished;
}

export function createAtlasProjection(featureCollection) {
  if (!isAtlasCountrySet() || state.atlasSet === "world") {
    return d3.geoNaturalEarth1().fitExtent([[28, 28], [972, 592]], featureCollection);
  }

  const regionalViews = {
    africa: { center: [20, 2], scale: 390 },
    asia: { center: [88, 36], scale: 285 },
    europe: { center: [16, 53], scale: 590 },
    "north-america": { center: [-105, 43], scale: 285 },
    "south-america": { center: [-61, -18], scale: 370 },
    oceania: { center: [150, -20], scale: 345 }
  };
  const view = regionalViews[state.atlasSet] || regionalViews.europe;

  return d3.geoMercator()
    .center(view.center)
    .scale(view.scale)
    .translate([500, 310]);
}

export function getAtlasOverviewFeature(feature) {
  return state.atlasOverviewFeatureByCode.get(getFeatureCode(feature)) || feature;
}

export function getAtlasProjectionCacheKey(isCountryMap, selectedFeatures) {
  if (isCountryMap && state.atlasSet !== "world") {
    return `region:${state.atlasSet}`;
  }

  return `natural:${selectedFeatures.map((feature) => getFeatureCode(feature) || "_").join(",")}`;
}

export function getAtlasPathCacheEntry(cacheKey, featureCollection) {
  let entry = state.atlasPathCache.get(cacheKey);

  if (entry) {
    state.atlasPathCache.delete(cacheKey);
    state.atlasPathCache.set(cacheKey, entry);
    return entry;
  }

  const projection = createAtlasProjection(featureCollection);
  entry = {
    projection,
    path: d3.geoPath(projection),
    overviewPaths: new Map(),
    fullPaths: new Map(),
    overviewBounds: new Map(),
    featureMetrics: new Map()
  };
  state.atlasPathCache.set(cacheKey, entry);

  while (state.atlasPathCache.size > ATLAS_PATH_CACHE_LIMIT) {
    state.atlasPathCache.delete(state.atlasPathCache.keys().next().value);
  }

  return entry;
}

export function getAtlasPathData(feature, detail, entry = state.atlasPathCacheEntry) {
  const paths = detail === "full" ? entry.fullPaths : entry.overviewPaths;

  if (!paths.has(feature)) {
    paths.set(feature, entry.path(detail === "full" ? feature : getAtlasOverviewFeature(feature)));
  }

  return paths.get(feature);
}

export function getAtlasOverviewBounds(feature, entry) {
  if (!entry.overviewBounds.has(feature)) {
    entry.overviewBounds.set(feature, entry.path.bounds(getAtlasOverviewFeature(feature)));
  }

  return entry.overviewBounds.get(feature);
}

export function getAtlasFeatureMetrics(feature, entry = state.atlasPathCacheEntry) {
  if (!entry.featureMetrics.has(feature)) {
    entry.featureMetrics.set(feature, {
      bounds: entry.path.bounds(feature),
      centroid: entry.path.centroid(feature),
      area: entry.path.area(feature)
    });
  }

  return entry.featureMetrics.get(feature);
}

export function cancelAtlasDetailPreparation() {
  if (state.atlasDetailIdleCancel) {
    state.atlasDetailIdleCancel();
    state.atlasDetailIdleCancel = null;
  }
}

export function scheduleAtlasIdle(callback) {
  if (typeof window.requestIdleCallback === "function") {
    const id = window.requestIdleCallback(callback, { timeout: 500 });
    return () => window.cancelIdleCallback(id);
  }

  const id = window.setTimeout(() => {
    const startedAt = performance.now();
    callback({ timeRemaining: () => Math.max(0, 8 - (performance.now() - startedAt)) });
  }, 0);
  return () => window.clearTimeout(id);
}

export function prepareAtlasFullDetail(features, entry) {
  cancelAtlasDetailPreparation();
  let index = 0;

  const prepareChunk = (deadline) => {
    state.atlasDetailIdleCancel = null;
    const startedAt = performance.now();

    do {
      getAtlasPathData(features[index], "full", entry);
      index += 1;
    } while (
      index < features.length
      && (deadline.timeRemaining() > 3 || performance.now() - startedAt < 6)
    );

    if (index < features.length) {
      state.atlasDetailIdleCancel = scheduleAtlasIdle(prepareChunk);
    }
  };

  state.atlasDetailIdleCancel = scheduleAtlasIdle(prepareChunk);
}

export function renderAtlasPhysicalHighlight(mapLayer, projection, path) {
  mapLayer.select(".atlas-target-layer").remove();
  const targetLayer = mapLayer
    .insert("g", ".atlas-country-layer")
    .attr("class", "atlas-target-layer");
  const marineFeatures = state.target?.kind === "waters"
    ? state.marineFeatureByName.get(normalize(state.target.name)) || []
    : [];

  if (marineFeatures.length) {
    targetLayer
      .selectAll("path")
      .data(marineFeatures)
      .join("path")
      .attr("class", "atlas-water-highlight")
      .attr("d", path);
    return;
  }

  if (state.target?.coordinates) {
    const [x, y] = projection(state.target.coordinates);
    const [rx, ry, angle] = ATLAS_WATER_FALLBACK_AREAS.get(state.target.id) || [16, 11, 0];
    targetLayer
      .append("ellipse")
      .attr("class", "atlas-water-highlight atlas-water-highlight-fallback")
      .attr("cx", x)
      .attr("cy", y)
      .attr("rx", rx)
      .attr("ry", ry)
      .attr("transform", `rotate(${angle} ${x} ${y})`);
  }
}

export function updateAtlasPhysicalCountryStyles(activeCodes) {
  state.atlasCountryPaths
    .attr("class", (feature) => activeCodes.has(getFeatureCode(feature))
      ? "atlas-country atlas-physical-target"
      : "atlas-country atlas-physical-base");
  state.atlasCountryPaths
    .filter((feature) => activeCodes.has(getFeatureCode(feature)))
    .raise();
}

export function updateAtlasMapDetail(transform = d3.zoomIdentity) {
  if (!state.atlasCountryPaths || !state.atlasPathCacheEntry) {
    return;
  }

  const detail = transform.k >= ATLAS_DETAIL_ZOOM ? "full" : "overview";
  if (state.atlasMapDetail === detail) {
    return;
  }

  state.atlasMapDetail = detail;
  state.atlasCountryPaths.attr("d", (feature) => getAtlasPathData(feature, detail));
  elements.atlasMap.dataset.detail = detail;
}

export function renderAtlasCountryMap() {
  if (!elements.atlasMap || !state.atlasFeatures.length || typeof d3 === "undefined") {
    return;
  }

  const isCountryMap = isAtlasCountrySet();
  const activeCodes = isCountryMap
    ? new Set(state.atlasQueue.map((place) => place.code))
    : getAtlasPhysicalTargetCodes(state.target);
  const selectedFeatures = isCountryMap
    ? state.atlasFeatures.filter((feature) => activeCodes.has(getFeatureCode(feature)))
    : state.atlasFeatures;
  const featureCollection = { type: "FeatureCollection", features: selectedFeatures };
  const pathCacheEntry = getAtlasPathCacheEntry(
    getAtlasProjectionCacheKey(isCountryMap, selectedFeatures),
    featureCollection
  );
  const { projection, path } = pathCacheEntry;
  const svg = d3.select(elements.atlasMap);
  const renderKey = `${isCountryMap ? "countries" : "physical"}:${getAtlasProjectionCacheKey(isCountryMap, selectedFeatures)}`;

  if (!isCountryMap && state.atlasRenderKey === renderKey && state.atlasMapLayer && state.atlasCountryPaths) {
    svg.interrupt();
    renderAtlasPhysicalHighlight(state.atlasMapLayer, projection, path);
    updateAtlasPhysicalCountryStyles(activeCodes);
    elements.atlasPosition.textContent = `${state.atlasIndex + 1} / ${state.atlasQueue.length}`;
    elements.atlasMapSelection.textContent = "Name the highlighted area";
    elements.giveUpButton.disabled = state.finished || state.atlasAnswered;
    focusAtlasTarget();
    return;
  }

  if (state.atlasZoomFrame !== null) {
    window.cancelAnimationFrame(state.atlasZoomFrame);
    state.atlasZoomFrame = null;
  }
  if (state.atlasPanAnimationFrame !== null) {
    window.cancelAnimationFrame(state.atlasPanAnimationFrame);
    state.atlasPanAnimationFrame = null;
  }
  state.atlasPendingTransform = null;
  state.atlasMapDetail = null;
  state.atlasCountryPaths = null;
  state.atlasTinyCountryMarkers = null;
  state.atlasCountryPathByCode = new Map();
  state.atlasTinyMarkerByCode = new Map();
  state.atlasPathCacheEntry = pathCacheEntry;
  state.atlasRenderKey = renderKey;
  cancelAtlasDetailPreparation();
  elements.atlasMap.classList.remove("is-interacting");
  svg.interrupt();
  svg.selectAll("*").remove();

  svg.append("rect")
    .attr("class", "atlas-map-water")
    .attr("width", 1000)
    .attr("height", 620);

  const mapLayer = svg.append("g").attr("class", "atlas-map-layer");
  state.atlasMapLayer = mapLayer;
  state.atlasMapPath = path;

  if (!isCountryMap && state.target) {
    renderAtlasPhysicalHighlight(mapLayer, projection, path);
  }

  const visibleFeatures = isCountryMap && state.atlasSet !== "world"
    ? state.atlasFeatures.filter((feature) => {
      if (activeCodes.has(getFeatureCode(feature))) {
        return true;
      }
      const [[left, top], [right, bottom]] = getAtlasOverviewBounds(feature, pathCacheEntry);
      return right >= -80 && left <= 1080 && bottom >= -80 && top <= 700;
    })
    : state.atlasFeatures;
  const orderedFeatures = [...visibleFeatures].sort((a, b) =>
    Number(activeCodes.has(getFeatureCode(a))) - Number(activeCodes.has(getFeatureCode(b)))
  );
  const countryLayer = mapLayer.append("g").attr("class", "atlas-country-layer");

  state.atlasCountryPaths = countryLayer
    .selectAll("path")
    .data(orderedFeatures)
    .join("path")
    .attr("data-country-code", (feature) => getFeatureCode(feature) || "")
    .attr("class", (feature) => {
      const isActive = activeCodes.has(getFeatureCode(feature));
      if (isCountryMap) {
        return isActive ? "atlas-country" : "atlas-country outside-set";
      }
      return isActive ? "atlas-country atlas-physical-target" : "atlas-country atlas-physical-base";
    });
  state.atlasCountryPathByCode = new Map(
    state.atlasCountryPaths.nodes().map((node) => [node.dataset.countryCode, node])
  );
  countryLayer.on("click", (event) => {
    if (!isCountryMap || event.defaultPrevented || !event.target.classList.contains("atlas-country")) {
      return;
    }

    selectAtlasCountry(getFeatureCode(event.target.__data__));
  });
  updateAtlasMapDetail();
  prepareAtlasFullDetail(orderedFeatures, pathCacheEntry);

  if (isCountryMap) {
    const tinyFeatures = selectedFeatures.filter((feature) => {
      const { bounds: [[left, top], [right, bottom]], area } = getAtlasFeatureMetrics(feature, pathCacheEntry);
      return Math.max(right - left, bottom - top) < 6 || area < 10;
    });
    const tinyCountryLayer = mapLayer.append("g").attr("class", "atlas-tiny-country-layer");

    state.atlasTinyCountryMarkers = tinyCountryLayer
      .selectAll("circle")
      .data(tinyFeatures)
      .join("circle")
      .attr("class", "atlas-tiny-country-marker")
      .attr("data-country-code", (feature) => getFeatureCode(feature) || "")
      .attr("cx", (feature) => getAtlasFeatureMetrics(feature, pathCacheEntry).centroid[0])
      .attr("cy", (feature) => getAtlasFeatureMetrics(feature, pathCacheEntry).centroid[1])
      .attr("r", 7)
      .attr("role", "button")
      .attr("aria-label", (_, index) => `Highlighted unentered country marker ${index + 1}`);
    state.atlasTinyMarkerByCode = new Map(
      state.atlasTinyCountryMarkers.nodes().map((node) => [node.dataset.countryCode, node])
    );
    tinyCountryLayer
      .on("click", (event) => {
        if (!event.defaultPrevented && event.target.classList.contains("atlas-tiny-country-marker")) {
          selectAtlasCountry(getFeatureCode(event.target.__data__));
        }
      })
      .on("keydown", (event) => {
        if (
          (event.key === "Enter" || event.key === " ")
          && event.target.classList.contains("atlas-tiny-country-marker")
        ) {
          event.preventDefault();
          selectAtlasCountry(getFeatureCode(event.target.__data__));
        }
      });
  }

  const zoomBehavior = d3.zoom()
    .scaleExtent([1, ATLAS_ZOOM_MAX])
    .extent([[0, 0], [1000, 620]])
    .translateExtent([[-120, -90], [1120, 710]])
    .on("start", (event) => {
      if (event.sourceEvent && state.atlasPanAnimationFrame !== null) {
        window.cancelAnimationFrame(state.atlasPanAnimationFrame);
        state.atlasPanAnimationFrame = null;
      }
      elements.atlasMap.classList.toggle("is-interacting", Boolean(event.sourceEvent));
    })
    .on("zoom", (event) => {
      state.atlasPendingTransform = event.transform;

      if (state.atlasZoomFrame !== null) {
        return;
      }

      state.atlasZoomFrame = window.requestAnimationFrame(() => {
        const transform = state.atlasPendingTransform;
        state.atlasZoomFrame = null;

        if (!transform || state.atlasMapLayer !== mapLayer) {
          return;
        }

        mapLayer.attr("transform", transform);
        if (state.atlasTinyCountryMarkers) {
          state.atlasTinyCountryMarkers.attr("r", 7 / transform.k);
        }
      });
    })
    .on("end", () => {
      elements.atlasMap.classList.remove("is-interacting");
      updateAtlasMapDetail(d3.zoomTransform(elements.atlasMap));
    });

  state.atlasZoomBehavior = zoomBehavior;
  svg.call(zoomBehavior);
  svg.call(zoomBehavior.transform, d3.zoomIdentity);
  if (isCountryMap) {
    updateAtlasCountryMapStyles();
  } else {
    elements.atlasPosition.textContent = `${state.atlasIndex + 1} / ${state.atlasQueue.length}`;
    elements.atlasMapSelection.textContent = "Name the highlighted area";
    elements.giveUpButton.disabled = state.finished || state.atlasAnswered;
    focusAtlasTarget();
  }
}

export function focusAtlasTarget() {
  if (!state.target?.coordinates || !state.atlasMapPath || !state.atlasZoomBehavior || typeof d3 === "undefined") {
    return;
  }

  const [x, y] = state.atlasMapPath.projection()(state.target.coordinates);
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return;
  }

  const scale = state.target.kind === "waters" ? 2.15 : 2.7;
  const transform = d3.zoomIdentity
    .translate(500 - scale * x, 310 - scale * y)
    .scale(scale);

  d3.select(elements.atlasMap)
    .transition()
    .duration(420)
    .ease(d3.easeCubicOut)
    .call(state.atlasZoomBehavior.transform, transform);
}

export function adjustAtlasZoom(factor) {
  if (!state.atlasZoomBehavior) {
    return;
  }

  d3.select(elements.atlasMap)
    .transition()
    .duration(180)
    .call(state.atlasZoomBehavior.scaleBy, factor);
}

export function resetAtlasZoom() {
  if (!state.atlasZoomBehavior) {
    return;
  }

  d3.select(elements.atlasMap)
    .transition()
    .duration(220)
    .call(state.atlasZoomBehavior.transform, d3.zoomIdentity);
}

export function panAtlasToCountry(code) {
  if (!isAtlasCountrySet() || !state.atlasZoomBehavior || !state.atlasMapPath || typeof d3 === "undefined") {
    return;
  }

  const feature = state.atlasFeatureByCode.get(code);
  if (!feature) {
    return;
  }

  const [countryX, countryY] = getAtlasFeatureMetrics(feature).centroid;
  if (!Number.isFinite(countryX) || !Number.isFinite(countryY)) {
    return;
  }

  const currentTransform = d3.zoomTransform(elements.atlasMap);
  const nextTransform = d3.zoomIdentity
    .translate(500 - currentTransform.k * countryX, 310 - currentTransform.k * countryY)
    .scale(currentTransform.k);

  if (Math.hypot(nextTransform.x - currentTransform.x, nextTransform.y - currentTransform.y) < 16) {
    return;
  }

  const map = d3.select(elements.atlasMap).interrupt();
  if (state.atlasPanAnimationFrame !== null) {
    window.cancelAnimationFrame(state.atlasPanAnimationFrame);
    state.atlasPanAnimationFrame = null;
  }
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    map.call(state.atlasZoomBehavior.transform, nextTransform);
    return;
  }

  const startedAt = performance.now();
  const duration = 220;
  const animatePan = (now) => {
    const progress = clamp((now - startedAt) / duration, 0, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const transform = d3.zoomIdentity
      .translate(
        currentTransform.x + (nextTransform.x - currentTransform.x) * eased,
        currentTransform.y + (nextTransform.y - currentTransform.y) * eased
      )
      .scale(currentTransform.k);

    elements.atlasMap.__zoom = transform;
    state.atlasMapLayer.attr("transform", transform);

    if (progress < 1) {
      state.atlasPanAnimationFrame = window.requestAnimationFrame(animatePan);
      return;
    }

    state.atlasPanAnimationFrame = null;
  };

  state.atlasPanAnimationFrame = window.requestAnimationFrame(animatePan);
}
