import { MAX_GUESSES } from "./constants.js";
import { toUtcDateKey, trackForGameType } from "./daily.js";

/*
 * Cross-session stats, per daily track.
 *
 * Streaks only respond to daily play: unlimited practice must not inflate them,
 * and Tricky's in-memory score (which was being wiped on every round start)
 * feeds its own record here so a best streak actually survives a reload.
 */

const STATS_KEY = "flaggo-stats-v1";

function emptyRecord() {
  return {
    played: 0,
    wins: 0,
    currentStreak: 0,
    maxStreak: 0,
    lastPlayedDate: null,
    /* index 0 = solved in 1 guess; the final slot counts losses */
    distribution: Array.from({ length: MAX_GUESSES + 1 }, () => 0),
    bestTimeMs: null
  };
}

function read() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STATS_KEY));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function write(all) {
  try {
    window.localStorage.setItem(STATS_KEY, JSON.stringify(all));
  } catch {
    // Stats are a nicety; never let a storage failure break a round.
  }
}

export function getStats(track) {
  const record = read()[track];

  return record ? { ...emptyRecord(), ...record } : emptyRecord();
}

export function getAllStats() {
  const all = read();

  return ["flag", "globe", "capitals"].map((track) => ({
    track,
    ...(all[track] ? { ...emptyRecord(), ...all[track] } : emptyRecord())
  }));
}

const isYesterdayOf = (previous, current) => {
  if (!previous) {
    return false;
  }

  const gap = Date.parse(`${current}T00:00:00Z`) - Date.parse(`${previous}T00:00:00Z`);

  return gap === 86400000;
};

/*
 * Recorded once per daily round, at the moment it finishes. `dateKey` guards
 * against double-counting when a finished round is restored from storage.
 */
export function recordDailyResult({ gameType, dateKey, won, guessCount, elapsedMs }) {
  const track = trackForGameType(gameType);
  const all = read();
  const record = all[track] ? { ...emptyRecord(), ...all[track] } : emptyRecord();

  if (record.lastPlayedDate === dateKey) {
    return record;
  }

  record.played += 1;

  if (won) {
    record.wins += 1;
    record.currentStreak = isYesterdayOf(record.lastPlayedDate, dateKey) ? record.currentStreak + 1 : 1;
    record.maxStreak = Math.max(record.maxStreak, record.currentStreak);

    const slot = Math.min(Math.max(guessCount, 1), MAX_GUESSES) - 1;
    record.distribution[slot] += 1;

    if (elapsedMs > 0 && (record.bestTimeMs === null || elapsedMs < record.bestTimeMs)) {
      record.bestTimeMs = elapsedMs;
    }
  } else {
    record.currentStreak = 0;
    record.distribution[MAX_GUESSES] += 1;
  }

  record.lastPlayedDate = dateKey;
  all[track] = record;
  write(all);

  return record;
}

/*
 * A streak is only "current" if it was extended today or yesterday; otherwise
 * the run is already broken and showing it would be a lie.
 */
export function getDisplayStreak(track) {
  const record = getStats(track);
  const today = toUtcDateKey();

  if (record.lastPlayedDate === today || isYesterdayOf(record.lastPlayedDate, today)) {
    return record.currentStreak;
  }

  return 0;
}

const TRICKY_KEY = "flaggo-tricky-v1";

export function getTrickyBest() {
  try {
    return Number(window.localStorage.getItem(TRICKY_KEY)) || 0;
  } catch {
    return 0;
  }
}

export function saveTrickyBest(streak) {
  if (streak <= getTrickyBest()) {
    return;
  }

  try {
    window.localStorage.setItem(TRICKY_KEY, String(streak));
  } catch {
    // Ignore storage failures.
  }
}
