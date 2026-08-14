import { MAX_GUESSES } from "../core/constants.js";
import { getAllStats, getDisplayStreak, getTrickyBest } from "../core/stats.js";

/* Renders the stored daily record into the settings modal. Read-only: nothing
   here mutates stats, so it is safe to call on every modal open. */

const TRACK_LABELS = {
  flag: "Flag",
  globe: "Globle",
  capitals: "Capitals"
};

function formatTime(ms) {
  if (!ms) {
    return "—";
  }

  const total = Math.round(ms / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function renderDistribution(record) {
  const peak = Math.max(1, ...record.distribution);

  return record.distribution
    .map((count, index) => {
      const label = index === MAX_GUESSES ? "X" : String(index + 1);
      const width = Math.round((count / peak) * 100);

      return `
        <div class="stats-dist-row">
          <span class="stats-dist-label">${label}</span>
          <span class="stats-dist-bar" style="width:${Math.max(width, count ? 8 : 2)}%">${count || ""}</span>
        </div>
      `;
    })
    .join("");
}

export function renderStatsPanel() {
  const container = document.querySelector("#stats-panel");

  if (!container) {
    return;
  }

  const records = getAllStats();
  const anyPlayed = records.some((record) => record.played > 0);
  const trickyBest = getTrickyBest();

  if (!anyPlayed && !trickyBest) {
    container.innerHTML = `<p class="stats-empty">Play a daily round and your streak shows up here.</p>`;
    return;
  }

  const cards = records
    .filter((record) => record.played > 0)
    .map((record) => {
      const winRate = record.played ? Math.round((record.wins / record.played) * 100) : 0;

      return `
        <section class="stats-card" aria-label="${TRACK_LABELS[record.track]} statistics">
          <h4 class="stats-card-title">${TRACK_LABELS[record.track]}</h4>
          <div class="stats-figures">
            <div><b>${record.played}</b><span>Played</span></div>
            <div><b>${winRate}%</b><span>Won</span></div>
            <div><b>${getDisplayStreak(record.track)}</b><span>Streak</span></div>
            <div><b>${record.maxStreak}</b><span>Best</span></div>
            <div><b>${formatTime(record.bestTimeMs)}</b><span>Fastest</span></div>
          </div>
          <div class="stats-dist">${renderDistribution(record)}</div>
        </section>
      `;
    })
    .join("");

  const tricky = trickyBest
    ? `<section class="stats-card"><h4 class="stats-card-title">Tricky</h4>
         <div class="stats-figures"><div><b>${trickyBest}</b><span>Best streak</span></div></div>
       </section>`
    : "";

  container.innerHTML = cards + tricky;
}
