import { HEAT_BANDS_KM, OPTIONAL_COUNTRY_CENTROIDS } from "./constants.js";
import { state } from "./state.js";

export async function loadCentroids() {
  const response = await fetch("./data/country-centroids.json");

  if (!response.ok) {
    throw new Error(`Failed to load country centroids: ${response.status}`);
  }

  const payload = await response.json();
  state.centroids = new Map((payload.entries || []).map((entry) => [entry.code, entry]));
  OPTIONAL_COUNTRY_CENTROIDS.forEach((entry) => {
    if (!state.centroids.has(entry.code)) {
      state.centroids.set(entry.code, entry);
    }
  });
}

export function getHeatClass(distanceKm) {
  if (distanceKm <= HEAT_BANDS_KM.hot) {
    return "hot";
  }

  if (distanceKm <= HEAT_BANDS_KM.warm) {
    return "warm";
  }

  return "cold";
}

export function getHeatLabel(heatClass) {
  if (heatClass === "hot") {
    return "hot";
  }

  if (heatClass === "warm") {
    return "warm";
  }

  return "cold";
}

export function formatDistance(distanceKm) {
  return `${Math.round(distanceKm).toLocaleString()} km away`;
}

export function calculateDistanceKm(from, to) {
  const earthRadiusKm = 6371;
  const deltaLat = toRadians(to.lat - from.lat);
  const deltaLng = toRadians(to.lng - from.lng);
  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function toRadians(value) {
  return (value * Math.PI) / 180;
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
