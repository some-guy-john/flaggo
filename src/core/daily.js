import { BASE_COUNTRIES, countryByCode } from "./catalog.js";

/*
 * Daily targets are derived, not fetched.
 *
 * This replaces three pre-generated schedule files (220 KB each, and they ran
 * out in 2036). The property those files had and a naive date-hash would lose
 * is that a country never repeats inside one cycle: each cycle is a full
 * permutation of the catalog, consumed one country per day.
 *
 * The seed comes from BASE_COUNTRIES, never the live `countries` array -- the
 * Taiwan/Kosovo settings must not shift which country the day serves.
 */

const DAY_MS = 86400000;

export function toUtcDateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function hashSeed(text) {
  let hash = 0x811c9dc5;

  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return hash >>> 0;
}

/* mulberry32: small, fast, and stable across engines. */
function createRandom(seed) {
  let state = seed >>> 0;

  return function random() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleWith(values, random) {
  const copy = [...values];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }

  return copy;
}

/* Sorted so the sequence never depends on catalog file ordering. */
let seedCodes = null;

function getSeedCodes() {
  if (!seedCodes) {
    seedCodes = BASE_COUNTRIES.map((country) => country.code).sort();
  }

  return seedCodes;
}

const cycleCache = new Map();

function getCycle(track, cycleIndex) {
  const key = `${track}:${cycleIndex}`;

  if (!cycleCache.has(key)) {
    const codes = getSeedCodes();
    cycleCache.set(key, shuffleWith(codes, createRandom(hashSeed(key))));

    /* One cycle back and forward is all any view needs. */
    if (cycleCache.size > 8) {
      cycleCache.delete(cycleCache.keys().next().value);
    }
  }

  return cycleCache.get(key);
}

export function getDailyCodeForDate(track, dateKey) {
  const codes = getSeedCodes();

  if (!codes.length) {
    return null;
  }

  const days = Math.floor(Date.parse(`${dateKey}T00:00:00Z`) / DAY_MS);

  if (!Number.isFinite(days)) {
    return null;
  }

  const cycleIndex = Math.floor(days / codes.length);
  const dayInCycle = ((days % codes.length) + codes.length) % codes.length;

  return getCycle(track, cycleIndex)[dayInCycle] || null;
}

export function getDailyCountryForDate(track, dateKey) {
  const code = getDailyCodeForDate(track, dateKey);

  return code ? countryByCode.get(code) || null : null;
}

/* Daily is always available now that nothing has to be fetched. Kept as a
   function because callers still gate on it, and lazily-loaded modes may
   reintroduce a real check. */
export function isDailyAvailable() {
  return getSeedCodes().length > 0;
}

export function trackForGameType(gameType) {
  return gameType === "globe" ? "globe" : gameType === "capitals" ? "capitals" : "flag";
}
