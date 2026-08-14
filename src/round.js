import { countries, countryByCode, findCountry, getFlagUrl, pickRandomCountry, shuffle } from "./core/catalog.js";
import { TOTAL_TILES } from "./core/constants.js";
import { getDailyCountryForDate, isDailyAvailable, toUtcDateKey, trackForGameType } from "./core/daily.js";
import { ensureGameReady, gameNeedsLoading } from "./core/loaders.js";
import { isPersistableRound, loadRoundProgress, saveRoundProgress } from "./core/progress.js";
import { recordDailyResult } from "./core/stats.js";
import { elements, state } from "./core/state.js";
import { saveSelection } from "./core/storage.js";
import { startGameTimer, stopGameTimer } from "./core/timer.js";
import { LOOKALIKE_GROUPS } from "./data/lookalikes.js";
import { clearAtlasAdvanceTimer, getAtlasSetDefinition } from "./games/atlas.js";
import { GAME_IDS, getGame } from "./games/registry.js";
import { queueGlobeRender, rotateGlobeToCountry } from "./map/globe.js";
import { renderGuesses, renderMask, revealAllTiles, setRoundInteractivity, updateStatus } from "./ui/board.js";
import { updateShareButton } from "./ui/share.js";
import { clearCountrySuggestions, clearSpellingCorrection, offerSpellingCorrection } from "./ui/suggest.js";

/* Identifies the in-flight mode switch so a superseded load cannot start a
   round for a mode the player has already navigated away from. */
let pendingModeSwitch = null;

/* The variable bits of the round, resolved once and handed to the descriptors
   so they never reach into state themselves. */
export function buildContext() {
  const atlasSet = getAtlasSetDefinition();

  return {
    gameType: state.gameType,
    isDaily: state.playMode === "daily",
    finished: state.finished,
    atlasSet,
    isAtlasCountryMap: state.gameType === "atlas" && atlasSet.kind === "countries",
    atlasAnswered: state.atlasAnswered,
    countriesCount: countries.length
  };
}

export function currentGame() {
  return getGame(state.gameType);
}

export function updateModeUI() {
  const game = currentGame();
  const ctx = buildContext();
  const { isDaily, isAtlasCountryMap } = ctx;

  /* Mode nav and stages: every game is toggled from its own descriptor, so
     nothing has to be listed twice. */
  GAME_IDS.forEach((id) => {
    const other = getGame(id);
    const active = id === game.id;

    elements[other.modeButton].classList.toggle("active", active);
    elements[other.stage].classList.toggle("is-hidden", !active);
    elements[other.stage].setAttribute("aria-hidden", String(!active));

    if (other.layoutClass) {
      elements.gameCenter.classList.toggle(other.layoutClass, active);
    }
  });

  elements.dailyModeButton.classList.toggle("active", isDaily);
  elements.unlimitedModeButton.classList.toggle("active", !isDaily);
  elements.playModeSwitch.classList.toggle("is-hidden", !game.supportsDaily);
  elements.atlasSetControl.classList.toggle("is-hidden", game.id !== "atlas");
  elements.atlasSetSelect.value = state.atlasSet;
  elements.capitalsRegionControl.classList.toggle("is-hidden", game.id !== "capitals" || isDaily);
  elements.capitalsRegionSelect.value = state.capitalsRegion;
  elements.hintsSwitch.classList.toggle("is-hidden", !game.supportsHints);
  elements.hintsOffButton.classList.toggle("active", !state.hintsEnabled);
  elements.hintsOnButton.classList.toggle("active", state.hintsEnabled);

  elements.pageTitle.textContent = game.pageTitle(ctx);
  elements.roundTitle.textContent = game.roundTitle(ctx);
  elements.guessesTitle.textContent = game.guessesTitle;

  /* A finished daily offers unlimited practice rather than a retry. */
  elements.newGameButton.textContent = isDaily && state.finished && game.supportsDaily
    ? "Play unlimited"
    : game.newGameLabel(ctx);
  elements.newGameButton.classList.toggle("is-hidden", game.newGameHidden(ctx));

  elements.giveUpButton.textContent = state.finished ? "Answer shown" : game.giveUpLabel(ctx);
  elements.guessButton.textContent = game.guessButtonLabel(ctx);
  elements.countryInputLabel.textContent = game.inputLabel;
  elements.countryInput.setAttribute("aria-autocomplete", game.autocomplete);
  elements.countryInput.placeholder = game.placeholder(ctx);
  elements.inputHint.innerHTML = game.inputHint(ctx);

  /* Flag mode is the only one that shows the image and its tile mask. */
  elements.flagImage.classList.toggle("is-hidden", game.id !== "flag");
  elements.flagMask.classList.toggle("is-hidden", game.id !== "flag");
  elements.globlePanel.classList.toggle("is-hidden", game.id !== "globe");
  elements.globlePanel.setAttribute("aria-hidden", String(game.id !== "globe"));
  elements.atlasShowRemainingButton.classList.toggle("is-hidden", !isAtlasCountryMap);
  elements.atlasRevealSelectedButton.classList.toggle("is-hidden", !isAtlasCountryMap);

  const guessFormSlot = document.querySelector("#guess-form-slot");
  if (guessFormSlot) {
    guessFormSlot.classList.toggle("is-hidden", !game.showsGuessForm);
  }
  elements.inputHint.classList.toggle("is-hidden", !game.showsGuessForm);
  updateShareButton();
}
export function finishRound(message, tone) {
  state.finished = true;
  /* Captured before stopGameTimer() clears the start marker, so the share
     block and the stats record agree on the same elapsed time. */
  state.elapsedMsAtFinish = state.timerStartedAt ? Date.now() - state.timerStartedAt : 0;
  stopGameTimer();
  elements.countryInput.value = "";
  clearSpellingCorrection();

  if (currentGame().revealsTilesOnFinish) {
    revealAllTiles();
  }

  /* Record before the UI updates so the board can render the new streak. */
  if (isPersistableRound() && state.dailyDateKey && !state.restoringRound) {
    const won = state.finishReason !== "gave-up"
      && state.guesses.some((guess) => guess.correct);

    recordDailyResult({
      gameType: state.gameType,
      dateKey: state.dailyDateKey,
      won,
      guessCount: state.guesses.length,
      elapsedMs: state.elapsedMsAtFinish
    });
  }

  saveRoundProgress();

  setRoundInteractivity(false);
  updateModeUI();
  updateStatus(message, tone);
  renderGuesses();
  queueGlobeRender();
}

export function submitGuess(rawValue) {
  if (state.finished) {
    updateStatus("That round is done. Start another round when you're ready.");
    return;
  }

  const game = currentGame();

  if (game.submitRaw) {
    game.submitRaw(rawValue);
    return;
  }

  /* Neither hook means the game takes no typed input (Tricky). */
  if (!game.submitCountry) {
    return;
  }

  const country = findCountry(rawValue);

  if (!country) {
    offerSpellingCorrection(rawValue, "That country name wasn’t recognized. Check the spelling and try again.");
    return;
  }

  clearCountrySuggestions();

  const alreadyGuessed = state.guesses.some((guess) => guess.code === country.code);
  if (alreadyGuessed) {
    updateStatus(`${country.name} is already on the board. Try ${game.duplicateNoun}.`, "failure");
    return;
  }

  game.submitCountry(country);
}

export function giveUp() {
  if (state.finished) {
    updateStatus("The round is already over. Start a new round when you're ready.");
    return;
  }

  currentGame().giveUp();
}

export function getTargetCountryForSelection() {
  if (state.playMode === "daily") {
    state.dailyDateKey = toUtcDateKey();
    const track = trackForGameType(state.gameType);
    return getDailyCountryForDate(track, state.dailyDateKey);
  }

  state.dailyDateKey = null;

  const pick = currentGame().pickTarget;

  return pick ? pick() : pickRandomCountry();
}

export function startGame() {
  clearAtlasAdvanceTimer();
  if (state.lookalikeAdvanceTimer !== null) {
    window.clearTimeout(state.lookalikeAdvanceTimer);
    state.lookalikeAdvanceTimer = null;
  }
  state.finishReason = null;
  startGameTimer();
  clearCountrySuggestions();

  const game = currentGame();

  /* Games that run their own session (map sets, card sets) take over here;
     the rest share the target-and-guess-board setup below. */
  if (game.start) {
    game.start();
    return;
  }

  const nextTarget = getTargetCountryForSelection();
  state.target = nextTarget || pickRandomCountry();
  state.guesses = [];
  state.suggestedCorrection = null;
  state.finished = false;
  state.revealedTiles = 0;
  state.revealOrder = game.revealOrder(shuffle, TOTAL_TILES);

  /* Rebuild today's daily from storage so a refresh does not hand back a fresh
     board -- and so a finished daily stays finished. */
  const saved = isPersistableRound() ? loadRoundProgress(state.gameType, state.dailyDateKey) : null;

  if (saved) {
    state.target = countryByCode.get(saved.code) || state.target;
    state.guesses = Array.isArray(saved.guesses) ? saved.guesses : [];
    state.revealOrder = Array.isArray(saved.revealOrder) && saved.revealOrder.length
      ? saved.revealOrder
      : state.revealOrder;
    state.revealedTiles = Number(saved.revealedTiles) || 0;
    state.finished = Boolean(saved.finished);
    state.finishReason = saved.finishReason || null;
    state.elapsedMsAtFinish = Number(saved.elapsedMs) || 0;
  }

  game.onRoundStart?.(state);

  updateModeUI();

  if (game.renderStage) {
    game.renderStage();
  } else {
    elements.flagImage.src = getFlagUrl(state.target.code);
    elements.flagImage.alt = "Mystery country flag";
  }

  elements.countryInput.value = "";
  setRoundInteractivity(true);

  /* A daily that was already played stays played. `restoringRound` keeps
     finishRound from re-recording the result against the stats. */
  if (saved?.finished) {
    const won = saved.finishReason !== "gave-up" && state.guesses.some((guess) => guess.correct);

    state.restoringRound = true;
    finishRound(
      won
        ? `Solved today's ${game.answerNoun} in ${state.guesses.length} ${state.guesses.length === 1 ? "guess" : "guesses"}. Come back tomorrow.`
        : `Today's answer was ${state.target.name}. Come back tomorrow.`,
      won ? "success" : "failure"
    );
    state.restoringRound = false;

    /* Point the restored globe at the answer without animating to it. */
    if (game.id === "globe") {
      rotateGlobeToCountry(state.target.code, false);
    }

    return;
  }

  updateStatus(game.introStatus(buildContext()), "default");

  clearSpellingCorrection();
  if (game.usesMask) {
    renderMask();
  }
  renderGuesses();
  queueGlobeRender();
  elements.countryInput.focus();
}

export async function setSelection(partial) {
  const nextGameType = partial.gameType ?? state.gameType;
  const nextPlayMode = partial.playMode ?? state.playMode;

  if (nextGameType === state.gameType && nextPlayMode === state.playMode) {
    return;
  }

  if (nextGameType !== "atlas" && nextGameType !== "lookalike" && nextPlayMode === "daily") {
    if (!isDailyAvailable()) {
      return;
    }
  }

  if (nextGameType === "lookalike" && (!LOOKALIKE_GROUPS || !LOOKALIKE_GROUPS.length)) {
    return;
  }

  /* Modes backed by deferred assets fetch on first entry. Guard against a
     second click switching modes mid-flight. */
  if (gameNeedsLoading(nextGameType)) {
    const token = Symbol("mode-switch");
    pendingModeSwitch = token;
    updateStatus("Loading…", "default");

    try {
      await ensureGameReady(nextGameType);
    } catch (error) {
      console.error(error);
      if (pendingModeSwitch === token) {
        pendingModeSwitch = null;
        updateStatus("That mode could not load. Check your connection and try again.", "failure");
      }
      return;
    }

    if (pendingModeSwitch !== token) {
      return;
    }

    pendingModeSwitch = null;
  }

  state.gameType = nextGameType;
  state.playMode = nextPlayMode;
  clearAtlasAdvanceTimer();
  saveSelection();
  startGame();
}
