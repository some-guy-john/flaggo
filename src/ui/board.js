import { MAX_GUESSES, TOTAL_TILES } from "../core/constants.js";
import { formatDistance, getHeatLabel } from "../core/geo.js";
import { elements, state } from "../core/state.js";
import { isAtlasCountrySet } from "../games/atlas.js";
import { getCapitalForCode } from "../games/capitals.js";
import { updateLookalikeScore } from "../games/lookalike.js";
import { panAtlasToCountry } from "../map/atlas.js";
import { getHeatFillColor } from "../map/globe.js";
import { renderSidebarHints } from "./hints.js";

export function renderGuesses() {
  elements.guessList.innerHTML = "";
  const isGlobe = state.gameType === "globe";
  const isAtlas = state.gameType === "atlas";
  const isLookalike = state.gameType === "lookalike";
  elements.guessList.classList.toggle("globle-board", isGlobe);
  elements.guessList.classList.toggle("atlas-board", isAtlas);
  elements.guessList.classList.toggle("round-over", !isGlobe && !isAtlas && !isLookalike && state.finished);
  renderSidebarHints();

  if (isAtlas) {
    const namedCount = state.guesses.filter((guess) => guess.correct).length;
    const total = state.atlasQueue.length;
    const completedCount = state.guesses.length;
    elements.historyCount.textContent = isAtlasCountrySet()
      ? `${namedCount} named · ${total - completedCount} left`
      : `${namedCount} / ${total} named`;

    if (!state.guesses.length) {
      const emptyItem = document.createElement("li");
      emptyItem.className = "guess-item empty";
      emptyItem.innerHTML = `
        <span class="guess-label">Set ready</span>
        <span class="guess-result">${isAtlasCountrySet()
          ? "Type country names until the map is complete."
          : "Name the highlighted area or reveal the answer if you're stuck."}</span>
      `;
      elements.guessList.appendChild(emptyItem);
      return;
    }

    [...state.guesses].reverse().forEach((guess) => {
      const item = document.createElement("li");
      item.className = `guess-item ${guess.correct ? "correct" : "incorrect"}`;
      item.innerHTML = `
        <span class="guess-label">${guess.number}. ${guess.name}</span>
        <span class="guess-result">${guess.correct ? "Named" : "Revealed"}${guess.code ? " · View" : ""}</span>
      `;
      if (isAtlasCountrySet() && guess.code) {
        item.classList.add("atlas-history-item");
        item.tabIndex = 0;
        item.setAttribute("role", "button");
        item.setAttribute("aria-label", `Pan map to ${guess.name}`);
        const panToGuess = () => panAtlasToCountry(guess.code);
        item.addEventListener("click", panToGuess);
        item.addEventListener("keydown", (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            panToGuess();
          }
        });
      }
      elements.guessList.appendChild(item);
    });
    return;
  }

  if (isGlobe) {
    elements.historyCount.textContent = state.finished ? "Round complete" : `${state.guesses.length} guesses`;

    if (!state.guesses.length) {
      const emptyItem = document.createElement("li");
      emptyItem.className = "guess-item empty";
      emptyItem.innerHTML = `
        <span class="guess-label">No guesses yet</span>
        <span class="guess-result">Guess any country. The globe will heat up as you get closer.</span>
      `;
      elements.guessList.appendChild(emptyItem);
      return;
    }

    const rankedGuesses = [...state.guesses].sort((a, b) => {
      if (a.correct !== b.correct) {
        return a.correct ? -1 : 1;
      }

      return (a.distanceKm ?? 0) - (b.distanceKm ?? 0);
    });

    rankedGuesses.forEach((guess, index) => {
      const item = document.createElement("li");
      item.className = `guess-item ${guess.correct ? "correct" : guess.heatClass}`;
      item.innerHTML = `
        <span class="guess-label">${index + 1}. ${guess.name}</span>
        <span class="guess-result">${guess.correct ? "Correct country" : `${formatDistance(guess.distanceKm)} · ${getHeatLabel(guess.heatClass)}`}</span>
      `;
      elements.guessList.appendChild(item);
    });

    return;
  }

  if (isLookalike) {
    updateLookalikeScore();

    if (!state.guesses.length) {
      const emptyItem = document.createElement("li");
      emptyItem.className = "guess-item empty";
      emptyItem.innerHTML = `
        <span class="guess-label">Pick a flag</span>
        <span class="guess-result">Click the flag that matches the country name shown.</span>
      `;
      elements.guessList.appendChild(emptyItem);
      return;
    }

    const recentGuesses = [...state.guesses].reverse().slice(0, 10);
    recentGuesses.forEach((guess) => {
      const item = document.createElement("li");
      item.className = `guess-item ${guess.correct ? "correct" : "incorrect"}`;
      item.innerHTML = `
        <span class="guess-label">${guess.name}</span>
        <span class="guess-result">${guess.correct ? "Correct" : "Wrong"}</span>
      `;
      elements.guessList.appendChild(item);
    });
    return;
  }

  const isCapitals = state.gameType === "capitals";
  const wrongResultLabel = isCapitals ? "Wrong capital" : "Tile opened";
  const answerLabel = isCapitals ? "Capital" : "Answer";

  elements.historyCount.textContent = state.finished
    ? state.finishReason === "gave-up" ? `${answerLabel} revealed` : "Round complete"
    : `${MAX_GUESSES - state.guesses.length} slots left`;

  if (state.finished) {
    state.guesses.forEach((guess, index) => {
      const item = document.createElement("li");
      item.className = `guess-item ${guess.correct ? "correct" : "incorrect"}`;
      item.innerHTML = `
        <span class="guess-label">${index + 1}. ${guess.name}</span>
        <span class="guess-result">${guess.correct ? "Correct" : wrongResultLabel}</span>
      `;
      elements.guessList.appendChild(item);
    });

    const result = document.createElement("li");
    result.className = `round-answer ${state.finishReason === "gave-up" ? "revealed" : "complete"}`;
    result.innerHTML = `
      <span>${state.finishReason === "gave-up" ? `${answerLabel} revealed` : answerLabel}</span>
      <strong>${isCapitals ? getCapitalForCode(state.target?.code) : (state.target?.name || "Round complete")}</strong>
      <small>${state.target && !isCapitals && getCapitalForCode(state.target.code) ? `Capital: ${getCapitalForCode(state.target.code)}. ` : ""}Choose ${
        state.gameType === "globe" ? "New globe"
        : state.gameType === "capitals" ? "New capitals"
        : "New flag"
      } to play again.</small>
    `;
    elements.guessList.appendChild(result);
    return;
  }

  for (let index = 0; index < MAX_GUESSES; index += 1) {
    const item = document.createElement("li");
    const guess = state.guesses[index];

    if (guess) {
      item.className = `guess-item ${guess.correct ? "correct" : "incorrect"}`;
      item.innerHTML = `
        <span class="guess-label">${index + 1}. ${guess.name}</span>
        <span class="guess-result">${guess.correct ? "Correct" : wrongResultLabel}</span>
      `;
    } else {
      item.className = `guess-item ${state.finished ? "locked" : "empty"}`;
      item.innerHTML = `
        <span class="guess-label">${index + 1}. ${state.finished ? "Round complete" : "Waiting..."}</span>
        <span class="guess-result">${state.finished ? "Start a new round to play again." : "Your next valid guess goes here."}</span>
      `;
    }

    elements.guessList.appendChild(item);
  }
}

export function updateStatus(message, tone = "default") {
  elements.statusMessage.textContent = message;
  elements.statusMessage.classList.toggle("success", tone === "success");
  elements.statusMessage.classList.toggle("failure", tone === "failure");
  elements.statusMessage.style.color =
    tone === "failure" ? "var(--danger)" : tone === "success" ? "var(--success)" : "var(--muted)";
}

export function setRoundInteractivity(enabled) {
  elements.countryInput.disabled = !enabled;
  elements.guessButton.disabled = !enabled;
  elements.giveUpButton.disabled = !enabled;
}

export function updateFlagFrameAspectRatio() {
  const { naturalWidth, naturalHeight } = elements.flagImage;

  if (!naturalWidth || !naturalHeight) {
    return;
  }

  elements.flagFrame.style.setProperty("--flag-aspect-ratio", `${naturalWidth} / ${naturalHeight}`);
  elements.flagFrame.style.setProperty("--flag-aspect-number", String(naturalWidth / naturalHeight));
}

export function updateCapitalFlagFrameAspectRatio() {
  const { naturalWidth, naturalHeight } = elements.capitalFlagImage;

  if (!naturalWidth || !naturalHeight || !elements.capitalFlagFrame) {
    return;
  }

  elements.capitalFlagFrame.style.setProperty("--flag-aspect-ratio", `${naturalWidth} / ${naturalHeight}`);
  elements.capitalFlagFrame.style.setProperty("--flag-aspect-number", String(naturalWidth / naturalHeight));
}

export function renderMask() {
  elements.flagMask.innerHTML = "";
  const openedTiles = new Set(state.revealOrder.slice(0, state.revealedTiles));

  for (let index = 0; index < TOTAL_TILES; index += 1) {
    const tile = document.createElement("span");
    tile.className = "mask-tile";

    if (openedTiles.has(index)) {
      tile.classList.add("revealed");
    }

    elements.flagMask.appendChild(tile);
  }
}

export function revealNextTile() {
  if (state.revealedTiles >= TOTAL_TILES) {
    return;
  }

  state.revealedTiles += 1;
  renderMask();
}

export function revealAllTiles() {
  state.revealedTiles = TOTAL_TILES;
  renderMask();
}

export function getGuessColor(guess) {
  if (!guess) {
    return "#f1eadf";
  }

  if (guess.correct) {
    return "#1f8f5f";
  }

  return getHeatFillColor(guess.distanceKm);
}
