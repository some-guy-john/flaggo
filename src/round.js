import { countries, countryByCode, findCountry, getFlagUrl, pickRandomCountry, shuffle } from "./core/catalog.js";
import { TOTAL_TILES } from "./core/constants.js";
import { getDailyCountryForDate, isDailyAvailable, toUtcDateKey, trackForGameType } from "./core/daily.js";
import { ensureGameReady, gameNeedsLoading } from "./core/loaders.js";
import { isPersistableRound, loadRoundProgress, saveRoundProgress } from "./core/progress.js";
import { getTrickyBest, recordDailyResult } from "./core/stats.js";
import { elements, state } from "./core/state.js";
import { saveSelection } from "./core/storage.js";
import { startGameTimer, stopGameTimer } from "./core/timer.js";
import { LOOKALIKE_GROUPS } from "./data/lookalikes.js";
import { clearAtlasAdvanceTimer, getAtlasSetDefinition, revealAtlasAnswer, startAtlasSession, submitAtlasGuess } from "./games/atlas.js";
import { pickCapitalTarget, renderCapitalStage, submitCapitalGuess } from "./games/capitals.js";
import { submitFlagGuess } from "./games/flag.js";
import { submitGlobeGuess } from "./games/globe.js";
import { startLookalikeRound } from "./games/lookalike.js";
import { queueGlobeRender, rotateGlobeToCountry } from "./map/globe.js";
import { renderGuesses, renderMask, revealAllTiles, setRoundInteractivity, updateStatus } from "./ui/board.js";
import { updateShareButton } from "./ui/share.js";
import { clearCountrySuggestions, clearSpellingCorrection, offerSpellingCorrection } from "./ui/suggest.js";

/* Identifies the in-flight mode switch so a superseded load cannot start a
   round for a mode the player has already navigated away from. */
let pendingModeSwitch = null;

export function updateModeUI() {
  const isFlag = state.gameType === "flag";
  const isGlobe = state.gameType === "globe";
  const isAtlas = state.gameType === "atlas";
  const isCapitals = state.gameType === "capitals";
  const isLookalike = state.gameType === "lookalike";
  const isDaily = state.playMode === "daily";
  const isUnlimited = state.playMode === "unlimited";
  const atlasSet = getAtlasSetDefinition();
  const isAtlasCountryMap = isAtlas && atlasSet.kind === "countries";

  elements.flagGameButton.classList.toggle("active", isFlag);
  elements.globleGameButton.classList.toggle("active", isGlobe);
  elements.atlasGameButton.classList.toggle("active", isAtlas);
  elements.capitalsGameButton.classList.toggle("active", isCapitals);
  elements.lookalikeGameButton.classList.toggle("active", isLookalike);
  elements.dailyModeButton.classList.toggle("active", isDaily);
  elements.unlimitedModeButton.classList.toggle("active", isUnlimited);
  elements.playModeSwitch.classList.toggle("is-hidden", isAtlas || isLookalike);
  elements.atlasSetControl.classList.toggle("is-hidden", !isAtlas);
  elements.atlasSetSelect.value = state.atlasSet;
  elements.capitalsRegionControl.classList.toggle("is-hidden", !isCapitals || isDaily);
  elements.capitalsRegionSelect.value = state.capitalsRegion;
  elements.hintsSwitch.classList.toggle("is-hidden", !isFlag && !isGlobe);
  elements.hintsOffButton.classList.toggle("active", !state.hintsEnabled);
  elements.hintsOnButton.classList.toggle("active", state.hintsEnabled);

  elements.pageTitle.textContent = isAtlas
    ? isAtlasCountryMap ? "Name every country on the map." : "Name the highlighted area."
    : isGlobe
      ? "Guess the country from the globe."
      : isCapitals
        ? "Name the capital from the country and its flag."
        : isLookalike
          ? "Pick the right flag from the lookalikes."
          : "Guess the country from its flag.";
  elements.roundTitle.textContent = isAtlas
    ? atlasSet.id === "world" ? `All ${countries.length} countries` : atlasSet.label
    : isGlobe
      ? isDaily ? "Daily globe mystery country" : "Unlimited globe practice"
      : isCapitals
        ? isDaily ? "Daily shared capital" : "Unlimited capitals practice"
        : isLookalike
          ? "Unlimited lookalike practice"
          : isDaily ? "Daily shared flag" : "Unlimited flag practice";
  elements.guessesTitle.textContent = isAtlas ? "Set progress" : isGlobe ? "Proximity board" : isLookalike ? "Pick history" : "Guess board";
  elements.newGameButton.textContent = isAtlas
    ? isAtlasCountryMap ? "Restart map" : state.finished ? "Restart set" : "Next map"
    : isLookalike ? "New set" : isGlobe ? "New globe" : isCapitals ? "New capitals" : "New flag";
  elements.newGameButton.textContent = isDaily && state.finished && !isAtlas && !isLookalike
    ? "Play unlimited"
    : elements.newGameButton.textContent;
  elements.newGameButton.classList.toggle(
    "is-hidden",
    isAtlas
      ? isAtlasCountryMap ? !state.finished : !state.atlasAnswered && !state.finished
      /* Daily hides the button mid-round, but shows it once finished so the
         player has somewhere to go that is not a retry of today's puzzle. */
      : isDaily && !state.finished
  );
  elements.giveUpButton.textContent = state.finished
    ? "Answer shown"
    : isAtlas ? isAtlasCountryMap ? "Give up" : "Reveal answer" : "Give up";
  elements.guessButton.textContent = isAtlas ? isAtlasCountryMap ? "Name country" : "Check" : "Guess";
  elements.countryInputLabel.textContent = isAtlas ? "Geographic area name" : isCapitals ? "Capital city" : "Country name";
  elements.countryInput.setAttribute("aria-autocomplete", isAtlas ? "none" : "list");
  elements.countryInput.placeholder = isAtlas
    ? isAtlasCountryMap ? "Type the full country name..." : "Name the highlighted area..."
    : isCapitals ? "Type the capital city name..." : "Type the full country name...";
  elements.inputHint.innerHTML = isAtlas
    ? isAtlasCountryMap
      ? "Type any country name. Click a country only when you want to reveal it."
      : "Enter the highlighted area's full name. Spelling help appears only after an unrecognized answer."
    : isCapitals
      ? "Type to search capital cities. Use <kbd>Tab</kbd> and <kbd>Shift + Tab</kbd> to move through matches, then <kbd>Enter</kbd> to autofill."
      : "Type to search countries. Use <kbd>Tab</kbd> and <kbd>Shift + Tab</kbd> to move through matches, then <kbd>Enter</kbd> to autofill.";
  elements.gameCenter.classList.toggle("globle-layout", isGlobe);
  elements.gameCenter.classList.toggle("atlas-layout", isAtlas);
  elements.gameCenter.classList.toggle("capitals-layout", isCapitals);
  elements.gameCenter.classList.toggle("lookalike-layout", isLookalike);
  elements.flagStage.classList.toggle("is-hidden", !isFlag);
  elements.globleStage.classList.toggle("is-hidden", !isGlobe);
  elements.atlasStage.classList.toggle("is-hidden", !isAtlas);
  elements.capitalStage.classList.toggle("is-hidden", !isCapitals);
  elements.lookalikeStage.classList.toggle("is-hidden", !isLookalike);

  elements.flagImage.classList.toggle("is-hidden", !isFlag);
  elements.flagMask.classList.toggle("is-hidden", !isFlag);
  elements.globlePanel.classList.toggle("is-hidden", !isGlobe);
  elements.globlePanel.setAttribute("aria-hidden", String(!isGlobe));
  elements.atlasStage.setAttribute("aria-hidden", String(!isAtlas));
  elements.capitalStage.setAttribute("aria-hidden", String(!isCapitals));
  elements.lookalikeStage.setAttribute("aria-hidden", String(!isLookalike));
  elements.atlasShowRemainingButton.classList.toggle("is-hidden", !isAtlasCountryMap);
  elements.atlasRevealSelectedButton.classList.toggle("is-hidden", !isAtlasCountryMap);

  const guessFormSlot = document.querySelector("#guess-form-slot");
  if (guessFormSlot) {
    guessFormSlot.classList.toggle("is-hidden", isLookalike);
  }
  elements.inputHint.classList.toggle("is-hidden", isLookalike);
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

  if (state.gameType !== "globe" && state.gameType !== "capitals" && state.gameType !== "lookalike") {
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

  if (state.gameType === "atlas") {
    submitAtlasGuess(rawValue);
    return;
  }

  if (state.gameType === "lookalike") {
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
    updateStatus(`${country.name} is already on the board. Try ${state.gameType === "capitals" ? "another capital" : "another country"}.`, "failure");
    return;
  }

  if (state.gameType === "capitals") {
    submitCapitalGuess(country);
    return;
  }

  if (state.gameType === "globe") {
    submitGlobeGuess(country);
    return;
  }

  submitFlagGuess(country);
}

export function giveUp() {
  if (state.finished) {
    updateStatus("The round is already over. Start a new round when you're ready.");
    return;
  }

  if (state.gameType === "atlas") {
    revealAtlasAnswer();
    return;
  }

  if (state.gameType === "lookalike") {
    state.finished = true;
    state.lookalikeAnswered = true;
    if (state.lookalikeAdvanceTimer !== null) {
      window.clearTimeout(state.lookalikeAdvanceTimer);
      state.lookalikeAdvanceTimer = null;
    }
    stopGameTimer();
    setRoundInteractivity(false);
    state.lookalikeScore.streak = 0;
    state.guesses.push({
      name: state.target.name,
      code: state.target.code,
      correct: false
    });
    const allCards = elements.lookalikeFlagsGrid.querySelectorAll(".lookalike-flag-card");
    allCards.forEach((card) => {
      const cardImg = card.querySelector("img");
      if (cardImg) {
        const cardCode = cardImg.src.split("/").pop().replace(".png", "");
        if (cardCode === state.target.code) {
          card.classList.add("correct");
        }
      }
    });
    updateStatus(`It was ${state.target.name}.`, "failure");
    updateModeUI();
    renderGuesses();
    return;
  }

  if (state.gameType === "capitals") {
    state.finishReason = "gave-up";
    finishRound("You gave up. The capital is revealed on the guess board.", "failure");
    return;
  }

  if (state.gameType === "globe") {
    state.finishReason = "gave-up";
    rotateGlobeToCountry(state.target.code);
    finishRound(`You gave up. The country was ${state.target.name}.`, "failure");
    return;
  }

  state.finishReason = "gave-up";
  finishRound("You gave up. The answer is revealed on the guess board.", "failure");
}

export function getTargetCountryForSelection() {
  if (state.playMode === "daily") {
    state.dailyDateKey = toUtcDateKey();
    const track = trackForGameType(state.gameType);
    return getDailyCountryForDate(track, state.dailyDateKey);
  }

  state.dailyDateKey = null;
  if (state.gameType === "capitals") {
    return pickCapitalTarget();
  }
  return pickRandomCountry();
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
  if (state.gameType === "atlas") {
    startAtlasSession();
    return;
  }

  if (state.gameType === "lookalike") {
    state.guesses = [];
    /* Session counters reset, but the all-time best is restored so it
       survives reloads instead of vanishing with the round. */
    state.lookalikeScore = { correct: 0, total: 0, streak: 0, bestStreak: getTrickyBest() };
    state.finished = false;
    setRoundInteractivity(true);
    updateModeUI();
    startLookalikeRound();
    return;
  }

  const nextTarget = getTargetCountryForSelection();
  state.target = nextTarget || pickRandomCountry();
  state.guesses = [];
  state.suggestedCorrection = null;
  state.finished = false;
  state.revealedTiles = 0;
  state.revealOrder = state.gameType === "flag"
    ? [1, 4, ...shuffle([0, 2, 3, 5])]
    : shuffle(Array.from({ length: TOTAL_TILES }, (_, index) => index));

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

  if (state.gameType === "globe") {
    state.globeRotation = [-20, -18, 0];
    state.globeZoom = 1;
    if (state.globeAnimationFrame) {
      cancelAnimationFrame(state.globeAnimationFrame);
      state.globeAnimationFrame = null;
    }
  }

  updateModeUI();

  if (state.gameType === "capitals") {
    renderCapitalStage();
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
        ? `Solved today's ${state.gameType === "capitals" ? "capital" : "country"} in ${state.guesses.length} ${state.guesses.length === 1 ? "guess" : "guesses"}. Come back tomorrow.`
        : `Today's answer was ${state.target.name}. Come back tomorrow.`,
      won ? "success" : "failure"
    );
    state.restoringRound = false;

    if (state.gameType === "globe") {
      rotateGlobeToCountry(state.target.code, false);
    }

    return;
  }

  if (state.gameType === "globe") {
    updateStatus(
      state.playMode === "daily"
        ? "Daily globe mode: a separate UTC-dated country is shared here each day."
        : "Unlimited globe mode: every new round picks another random country.",
      "default"
    );
  } else if (state.gameType === "capitals") {
    updateStatus(
      state.playMode === "daily"
        ? "Daily capitals mode: a shared country is picked each day. Name its capital."
        : "Unlimited capitals mode: every new round shows a country. Name its capital.",
      "default"
    );
  } else {
    updateStatus(
      state.playMode === "daily"
        ? "Daily flag mode: a separate UTC-dated flag is shared here each day."
        : "Unlimited flag mode: every new round picks another random flag.",
      "default"
    );
  }

  clearSpellingCorrection();
  if (state.gameType !== "capitals") {
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
