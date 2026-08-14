import { getCountrySuggestions } from "./core/catalog.js";
import { ATLAS_SET_IDS, ATLAS_ZOOM_BUTTON_FACTOR, CAPITALS_REGIONS, GLOBE_ZOOM_BUTTON_FACTOR } from "./core/constants.js";
import { isDailyAvailable, trackForGameType } from "./core/daily.js";
import { ensureGameReady, gameNeedsLoading } from "./core/loaders.js";
import { isPersistableRound } from "./core/progress.js";
import { elements, hintView, state } from "./core/state.js";
import { getSavedSelection, getSavedTheme, initRecognitionOptions, initSoundSettings, initSoundToggle, saveSelection } from "./core/storage.js";
import { LOOKALIKE_GROUPS } from "./data/lookalikes.js";
import { advanceAtlas, isAtlasCountrySet, revealAtlasCountryByCode, startAtlasSession } from "./games/atlas.js";
import { adjustAtlasZoom, resetAtlasZoom, updateAtlasCountryMapStyles } from "./map/atlas.js";
import { loadAtlasCountries } from "./map/data.js";
import { adjustGlobeZoom, beginGlobeDrag, endGlobeDrag, handleGlobeWheelZoom, moveGlobeDrag, queueGlobeRender } from "./map/globe.js";
import { giveUp, setSelection, startGame, submitGuess } from "./round.js";
import { updateCapitalFlagFrameAspectRatio, updateFlagFrameAspectRatio, updateStatus } from "./ui/board.js";
import { resizeConfettiCanvas } from "./ui/confetti.js";
import { setHintsEnabled, showHintAt } from "./ui/hints.js";
import { initSettingsModal, initSiteZoom } from "./ui/settings.js";
import { initShare } from "./ui/share.js";
import { acceptCountrySuggestion, acceptSpellingCorrection, clearCountrySuggestions, clearSpellingCorrection, renderCountrySuggestions, stepCountrySuggestion } from "./ui/suggest.js";
import { applyTheme, initPalette, toggleTheme } from "./ui/theme.js";

elements.countryInput.addEventListener("input", (event) => {
  clearSpellingCorrection();
  state.countrySuggestions = getCountrySuggestions(event.target.value);
  state.highlightedSuggestionIndex = -1;
  renderCountrySuggestions();
});

elements.countryInput.addEventListener("keydown", (event) => {
  if (state.countrySuggestions.length) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      stepCountrySuggestion(1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      stepCountrySuggestion(-1);
    } else if (event.key === "Tab") {
      event.preventDefault();
      stepCountrySuggestion(event.shiftKey ? -1 : 1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const index = state.highlightedSuggestionIndex < 0 ? 0 : state.highlightedSuggestionIndex;
      acceptCountrySuggestion(state.countrySuggestions[index]);
    }
  }

  if (event.key === "Enter" && state.suggestedCorrection) {
    event.preventDefault();
    const correction = state.suggestedCorrection;
    acceptSpellingCorrection(correction);
    submitGuess(correction.name);
  }

  if (event.key === "Escape") {
    clearCountrySuggestions();
    clearSpellingCorrection();
  }
});

elements.countryInput.addEventListener("blur", () => {
  window.setTimeout(clearCountrySuggestions, 100);
});

document.addEventListener("keydown", (event) => {
  const target = event.target;
  const isTypingInAnotherField = target instanceof Element
    && target !== elements.countryInput
    && target.matches("input, textarea, select, [contenteditable='true']");
  const modalIsOpen = elements.modalOverlay?.classList.contains("open");

  if (
    event.defaultPrevented
    || state.finished
    || event.ctrlKey
    || event.metaKey
    || event.altKey
    || event.key.length !== 1
    || isTypingInAnotherField
    || modalIsOpen
  ) {
    return;
  }

  event.preventDefault();
  elements.countryInput.focus();
  elements.countryInput.setRangeText(event.key, elements.countryInput.selectionStart, elements.countryInput.selectionEnd, "end");
  elements.countryInput.dispatchEvent(new Event("input", { bubbles: true }));
});

elements.guessForm.addEventListener("submit", (event) => {
  event.preventDefault();
  submitGuess(elements.countryInput.value);
});

elements.flagGameButton.addEventListener("click", () => {
  setSelection({ gameType: "flag" });
});

elements.globleGameButton.addEventListener("click", () => {
  setSelection({ gameType: "globe" });
});

elements.atlasGameButton.addEventListener("click", () => {
  setSelection({ gameType: "atlas" });
});

elements.capitalsGameButton.addEventListener("click", () => {
  setSelection({ gameType: "capitals" });
});

elements.lookalikeGameButton.addEventListener("click", () => {
  setSelection({ gameType: "lookalike", playMode: "unlimited" });
});

elements.dailyModeButton.addEventListener("click", () => {
  setSelection({ playMode: "daily" });
});

elements.unlimitedModeButton.addEventListener("click", () => {
  setSelection({ playMode: "unlimited" });
});

elements.atlasSetSelect.addEventListener("change", (event) => {
  const nextSet = event.target.value;
  if (!ATLAS_SET_IDS.has(nextSet) || nextSet === state.atlasSet) {
    return;
  }

  state.atlasSet = nextSet;
  saveSelection();
  startAtlasSession();
});

elements.capitalsRegionSelect.addEventListener("change", (event) => {
  const nextRegion = event.target.value;
  if (!CAPITALS_REGIONS.has(nextRegion) || nextRegion === state.capitalsRegion) {
    return;
  }

  state.capitalsRegion = nextRegion;
  saveSelection();
  if (state.gameType === "capitals" && state.playMode === "unlimited") {
    startGame();
  }
});

elements.hintsOffButton.addEventListener("click", () => setHintsEnabled(false));
elements.hintsOnButton.addEventListener("click", () => setHintsEnabled(true));
elements.hintPrevButton.addEventListener("click", () => {
  if (hintView.index > 0) {
    showHintAt(hintView.index - 1);
  }
});
elements.hintNextButton.addEventListener("click", () => {
  if (hintView.index < hintView.unlocked - 1) {
    showHintAt(hintView.index + 1);
  }
});

elements.newGameButton.addEventListener("click", () => {
  if (state.gameType === "lookalike") {
    startGame();
    return;
  }

  if (state.gameType !== "atlas") {
    /* A finished daily is done for the day. The button switches the player to
       unlimited practice rather than re-rolling the same puzzle. */
    if (isPersistableRound() && state.finished) {
      setSelection({ playMode: "unlimited" });
      return;
    }

    startGame();
    return;
  }

  if (state.finished) {
    startAtlasSession();
    return;
  }

  if (state.atlasAnswered) {
    advanceAtlas();
  }
});
elements.giveUpButton.addEventListener("click", giveUp);
elements.themeToggle.addEventListener("click", toggleTheme);
elements.flagImage.addEventListener("load", updateFlagFrameAspectRatio);
elements.capitalFlagImage.addEventListener("load", updateCapitalFlagFrameAspectRatio);
elements.globeCanvas.addEventListener("pointerdown", beginGlobeDrag);
elements.globeCanvas.addEventListener("pointermove", moveGlobeDrag);
elements.globeCanvas.addEventListener("pointerup", endGlobeDrag);
elements.globeCanvas.addEventListener("pointercancel", endGlobeDrag);
elements.globeCanvas.addEventListener("wheel", handleGlobeWheelZoom, { passive: false });
elements.globeZoomInButton.addEventListener("click", () => adjustGlobeZoom(GLOBE_ZOOM_BUTTON_FACTOR));
elements.globeZoomOutButton.addEventListener("click", () => adjustGlobeZoom(1 / GLOBE_ZOOM_BUTTON_FACTOR));
elements.atlasZoomInButton.addEventListener("click", () => adjustAtlasZoom(ATLAS_ZOOM_BUTTON_FACTOR));
elements.atlasZoomOutButton.addEventListener("click", () => adjustAtlasZoom(1 / ATLAS_ZOOM_BUTTON_FACTOR));
elements.atlasZoomResetButton.addEventListener("click", resetAtlasZoom);
elements.atlasShowRemainingButton.addEventListener("click", () => {
  if (!isAtlasCountrySet() || state.finished) {
    return;
  }

  state.atlasShowRemaining = !state.atlasShowRemaining;
  updateAtlasCountryMapStyles();
});
elements.atlasRevealSelectedButton.addEventListener("click", () => {
  revealAtlasCountryByCode(state.atlasSelectedCountryCode);
  state.atlasSelectedCountryCode = null;
  updateAtlasCountryMapStyles();
  elements.countryInput.focus();
});

window.addEventListener("resize", () => {
  resizeConfettiCanvas();
  queueGlobeRender();
});

async function init() {
  initSoundSettings();
  applyTheme(getSavedTheme());
  initPalette();
  initSiteZoom();
  initRecognitionOptions();
  initSoundToggle();
  initSettingsModal();
  initShare();
  resizeConfettiCanvas();

  /* Atlas country records derive from the catalog already in memory, so this
     is cheap and keeps the map mode selectable without a fetch. */
  try {
    loadAtlasCountries();
  } catch (error) {
    console.error(error);
    elements.atlasGameButton.disabled = true;
  }

  const savedSelection = getSavedSelection();
  state.gameType = savedSelection.gameType;
  state.playMode = savedSelection.playMode;
  state.atlasSet = savedSelection.atlasSet;
  state.capitalsRegion = savedSelection.capitalsRegion;
  state.hintsEnabled = savedSelection.hintsEnabled;

  if (state.gameType !== "atlas" && state.gameType !== "lookalike" && state.playMode === "daily") {
    if (!isDailyAvailable()) {
      state.playMode = "unlimited";
    }
  }

  if (state.gameType === "atlas" && !state.atlasCountries.length) {
    state.gameType = "flag";
  }

  if (state.gameType === "lookalike" && (!LOOKALIKE_GROUPS || !LOOKALIKE_GROUPS.length)) {
    state.gameType = "flag";
  }

  saveSelection();
  registerServiceWorker();

  /* Modes whose data is deferred need it before their first round. Flag,
     Tricky and the rest paint immediately -- nothing is awaited above. */
  if (gameNeedsLoading(state.gameType)) {
    const restoring = state.gameType;
    state.gameType = "flag";
    startGame();

    try {
      await ensureGameReady(restoring);
      state.gameType = restoring;
      startGame();
    } catch (error) {
      console.error(error);
      updateStatus("That mode could not load, so Flag mode is showing instead.", "failure");
      saveSelection();
    }

    return;
  }

  startGame();
}

/*
 * Registered after the first round is set up so the install never competes
 * with the critical path. The relative URL is what keeps this working both at
 * a domain root and under /flaggo/ on GitHub Pages.
 */
function registerServiceWorker() {
  if (!("serviceWorker" in navigator) || location.protocol === "file:") {
    return;
  }

  /* Resolved against the document, not import.meta.url: this module lives in
     /src/, and the worker must sit at the site root to claim the whole scope. */
  const workerUrl = new URL("./sw.js", document.baseURI);
  const scope = new URL("./", document.baseURI);

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(workerUrl, { scope })
      .catch((error) => console.warn("Service worker registration failed:", error));
  });
}

init();
