import { countryByCode } from "./catalog.js";
import { toUtcDateKey, trackForGameType } from "./daily.js";
import { state } from "./state.js";

/*
 * Daily round persistence.
 *
 * Before this, nothing about a round survived a refresh and "New flag" simply
 * re-served the same daily target with a clean board -- so a daily could be
 * retried until it was won, which is the same as having no daily at all.
 *
 * One record per track per UTC date. Unlimited rounds are deliberately not
 * persisted: they are practice and should stay disposable.
 */

const PROGRESS_KEY = "flaggo-progress-v1";
const KEEP_DAYS = 7;

function read() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(PROGRESS_KEY));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function write(all) {
  try {
    window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(all));
  } catch {
    // Storage full or blocked: the round still plays, it just will not restore.
  }
}

/* Keeps the record from growing without bound; a week is enough to cover a
   missed day or two and any clock skew. */
function prune(all) {
  const cutoff = toUtcDateKey(new Date(Date.now() - KEEP_DAYS * 86400000));

  Object.keys(all).forEach((key) => {
    const date = key.slice(key.indexOf(":") + 1);
    if (date < cutoff) {
      delete all[key];
    }
  });

  return all;
}

function keyFor(track, dateKey) {
  return `${track}:${dateKey}`;
}

export function isPersistableRound() {
  return state.playMode === "daily" && state.gameType !== "atlas" && state.gameType !== "lookalike";
}

export function saveRoundProgress() {
  if (!isPersistableRound() || !state.dailyDateKey || !state.target) {
    return;
  }

  const track = trackForGameType(state.gameType);
  const all = prune(read());

  all[keyFor(track, state.dailyDateKey)] = {
    code: state.target.code,
    guesses: state.guesses,
    finished: state.finished,
    finishReason: state.finishReason,
    revealOrder: state.revealOrder,
    revealedTiles: state.revealedTiles,
    elapsedMs: state.timerStartedAt ? Date.now() - state.timerStartedAt : 0,
    savedAt: Date.now()
  };

  write(all);
}

export function loadRoundProgress(gameType, dateKey) {
  const record = read()[keyFor(trackForGameType(gameType), dateKey)];

  if (!record || !record.code) {
    return null;
  }

  /* A target that no longer resolves (catalog change, Taiwan/Kosovo toggled
     off) means the stored round cannot be rebuilt faithfully -- start fresh. */
  if (!countryByCode.get(record.code)) {
    return null;
  }

  return record;
}

export function hasFinishedToday(gameType) {
  return Boolean(loadRoundProgress(gameType, toUtcDateKey())?.finished);
}

export function clearRoundProgress(gameType, dateKey) {
  const all = read();
  delete all[keyFor(trackForGameType(gameType), dateKey)];
  write(all);
}
