import { MAX_GUESSES } from "../core/constants.js";
import { toUtcDateKey, trackForGameType } from "../core/daily.js";
import { elements, state } from "../core/state.js";
import { getDisplayStreak } from "../core/stats.js";

/*
 * Spoiler-free result blocks.
 *
 * Nothing here may contain the answer: these get pasted into group chats where
 * people have not played yet. Squares encode how the round went, never what it
 * was. shareTextForRound() is exported separately from the copy handler so the
 * smoke suite can assert on the text without touching the clipboard.
 */

/* Day 1 is the first daily; matches the cycle arithmetic in core/daily.js. */
const EPOCH_DAY = Math.floor(Date.parse("2026-07-01T00:00:00Z") / 86400000);

function puzzleNumber(dateKey) {
  return Math.floor(Date.parse(`${dateKey}T00:00:00Z`) / 86400000) - EPOCH_DAY + 1;
}

function formatElapsed(ms) {
  if (!ms || ms < 0) {
    return null;
  }

  const total = Math.round(ms / 1000);

  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

const HEAT_SQUARE = { hot: "🟥", warm: "🟧", cold: "🟦" };

function tileRow() {
  /* One square per guess: green for the solve, yellow for each opened tile. */
  return state.guesses
    .map((guess) => (guess.correct ? "🟩" : "🟨"))
    .concat(Array.from({ length: Math.max(0, MAX_GUESSES - state.guesses.length) }, () => "⬜"))
    .join("");
}

function heatRow() {
  return state.guesses
    .map((guess) => (guess.correct ? "🟩" : HEAT_SQUARE[guess.heatClass] || "🟦"))
    .join("");
}

export function shareTextForRound() {
  if (!state.finished || state.playMode !== "daily") {
    return null;
  }

  if (state.gameType === "atlas" || state.gameType === "lookalike") {
    return null;
  }

  const dateKey = state.dailyDateKey || toUtcDateKey();
  const solved = state.finishReason !== "gave-up" && state.guesses.some((guess) => guess.correct);
  const score = solved ? `${state.guesses.length}/${MAX_GUESSES}` : `X/${MAX_GUESSES}`;

  const labels = { flag: "Flag", globe: "Globle", capitals: "Capitals" };
  const label = labels[state.gameType] || "Flag";

  const parts = [`Flaggo ${label} #${puzzleNumber(dateKey)} ${score}`];

  const elapsed = formatElapsed(state.elapsedMsAtFinish);
  if (elapsed) {
    parts[0] += `  ⏱ ${elapsed}`;
  }

  const streak = getDisplayStreak(trackForGameType(state.gameType));
  if (streak > 1) {
    parts[0] += `  🔥${streak}`;
  }

  parts.push(state.gameType === "globe" ? heatRow() : tileRow());
  /* Drop the index.html so the pasted link is the clean site URL, and keep any
     subdirectory (GitHub Pages serves projects from /<repo>/). */
  parts.push(window.location.origin + window.location.pathname.replace(/index\.html$/, ""));

  return parts.join("\n");
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    /* Clipboard API needs a secure context and permission; fall back to the
       old selection trick so http:// and older browsers still work. */
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();

    let copied = false;
    try {
      copied = document.execCommand("copy");
    } catch {
      copied = false;
    }

    area.remove();
    return copied;
  }
}

export function updateShareButton() {
  const button = elements.shareButton;

  if (!button) {
    return;
  }

  const available = Boolean(shareTextForRound());
  button.classList.toggle("is-hidden", !available);
  button.textContent = "Share result";
  button.disabled = !available;
}

export function initShare() {
  const button = elements.shareButton;

  if (!button) {
    return;
  }

  button.addEventListener("click", async () => {
    const text = shareTextForRound();

    if (!text) {
      return;
    }

    const copied = await copyText(text);
    button.textContent = copied ? "Copied" : "Press Ctrl+C";
    window.setTimeout(() => updateShareButton(), 1800);
  });
}
