import { OPTIONAL_COUNTRIES } from "./constants.js";
import { state } from "./state.js";
import { COUNTRIES } from "../data/countries.js";
import { getAtlasPlacesForSet } from "../games/atlas.js";
import { getCapitalCandidates } from "../games/capitals.js";

export const BASE_COUNTRIES = [...COUNTRIES];

export let countries = [];
export let countryByCode = new Map();

export function normalize(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim();
}

export function getFlagUrl(code) {
  return `./flags/${code}.png`;
}

export function pickRandomCountry() {
  const index = Math.floor(Math.random() * countries.length);
  return countries[index];
}

export function shuffle(values) {
  const copy = [...values];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }

  return copy;
}

export function refreshCountryCatalog() {
  const selectedOptionalCountries = OPTIONAL_COUNTRIES.filter((country) =>
    (country.code === "tw" && state.recognitionOptions.taiwan)
    || (country.code === "xk" && state.recognitionOptions.kosovo)
  );
  countries = [...BASE_COUNTRIES, ...selectedOptionalCountries].sort((a, b) => a.name.localeCompare(b.name));
  countryByCode = new Map(countries.map((country) => [country.code, country]));
}

export function findCountry(query) {
  const normalizedQuery = normalize(query);
  const pool = state.gameType === "capitals" ? getCapitalCandidates() : countries;

  return pool.find((country) => {
    if (normalize(country.name) === normalizedQuery) {
      return true;
    }

    return (country.aliases || []).some((alias) => normalize(alias) === normalizedQuery);
  });
}

export function scoreCandidate(country, normalizedQuery) {
  const primaryName = normalize(country.name);
  const aliases = (country.aliases || []).map((name) => normalize(name));
  return primaryName.startsWith(normalizedQuery)
    ? 4
    : aliases.some((name) => name.startsWith(normalizedQuery))
      ? 3
      : primaryName.includes(normalizedQuery)
        ? 2
        : aliases.some((name) => name.includes(normalizedQuery))
          ? 1
          : 0;
}

export function getCountrySuggestions(query) {
  const normalizedQuery = normalize(query);

  if (!normalizedQuery || state.gameType === "atlas" || state.finished) {
    return [];
  }

  const pool = state.gameType === "capitals" ? getCapitalCandidates() : countries;

  return pool
    .map((country) => ({ country, score: scoreCandidate(country, normalizedQuery) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.country.name.localeCompare(b.country.name))
    .slice(0, 8)
    .map((entry) => entry.country);
}

export function getInputCandidates() {
  if (state.gameType === "atlas") {
    return getAtlasPlacesForSet();
  }
  return state.gameType === "capitals" ? getCapitalCandidates() : countries;
}

export function getEditDistance(left, right) {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];

    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const substitutionCost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + substitutionCost
      );
    }

    previous.splice(0, previous.length, ...current);
  }

  return previous[right.length];
}

export function getSpellingCorrection(query) {
  const normalizedQuery = normalize(query).replace(/[\s-]/g, "");

  if (normalizedQuery.length < 4 || state.finished) {
    return null;
  }

  const candidates = getInputCandidates();
  const exactMatch = candidates.some((place) =>
    [place.name, ...(place.aliases || [])]
      .map((answer) => normalize(answer).replace(/[\s-]/g, ""))
      .includes(normalizedQuery)
  );

  if (exactMatch) {
    return null;
  }

  const maximumDistance = Math.min(3, Math.max(1, Math.ceil(normalizedQuery.length * 0.2)));
  const ranked = candidates
    .map((place) => {
      const distance = Math.min(
        ...[place.name, ...(place.aliases || [])].map((answer) =>
          getEditDistance(normalizedQuery, normalize(answer).replace(/[\s-]/g, ""))
        )
      );
      return { place, distance };
    })
    .filter((entry) => entry.distance <= maximumDistance)
    .sort((a, b) => a.distance - b.distance || a.place.name.localeCompare(b.place.name));

  if (!ranked.length || (ranked[1] && ranked[1].distance === ranked[0].distance)) {
    return null;
  }

  return ranked[0].place;
}
