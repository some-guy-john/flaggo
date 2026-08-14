import { findCountry, normalize, shuffle } from "../core/catalog.js";
import { ATLAS_ISLANDS, ATLAS_PHYSICAL_COORDINATES, ATLAS_PHYSICAL_PLACES, ATLAS_SETS } from "../core/constants.js";
import { elements, state } from "../core/state.js";
import { startGameTimer, stopGameTimer } from "../core/timer.js";
import { getAtlasCountryPlaceByCode, getAtlasMapHeading, panAtlasToCountry, renderAtlasCountryMap, updateAtlasCountryMapEntry, updateAtlasCountryMapStyles } from "../map/atlas.js";
import { updateModeUI } from "../round.js";
import { renderGuesses, setRoundInteractivity, updateStatus } from "../ui/board.js";
import { launchConfetti } from "../ui/confetti.js";
import { clearCountrySuggestions, clearSpellingCorrection, offerSpellingCorrection } from "../ui/suggest.js";

export function getAtlasSetDefinition() {
  return ATLAS_SETS.find((set) => set.id === state.atlasSet) || ATLAS_SETS[0];
}

export function getAtlasPlacesForSet() {
  const set = getAtlasSetDefinition();

  if (set.kind === "countries") {
    return set.region
      ? state.atlasCountries.filter((place) => place.region === set.region)
      : state.atlasCountries;
  }

  if (set.kind === "islands") {
    return ATLAS_ISLANDS.map((place) => ({ ...place, coordinates: ATLAS_PHYSICAL_COORDINATES.get(place.id) || null }));
  }

  if (set.kind === "continents") {
    return ATLAS_PHYSICAL_PLACES
      .filter((place) => place.kind === "continents")
      .map((place) => ({ ...place, coordinates: ATLAS_PHYSICAL_COORDINATES.get(place.id) || null }));
  }

  const oceanIds = new Set(["pacific_ocean", "atlantic_ocean", "indian_ocean", "arctic_ocean", "southern_ocean"]);
  return ATLAS_PHYSICAL_PLACES
    .filter((place) => place.kind === "waters" && (set.kind === "oceans" ? oceanIds.has(place.id) : !oceanIds.has(place.id)))
    .map((place) => ({ ...place, coordinates: ATLAS_PHYSICAL_COORDINATES.get(place.id) || null }));
}

export function isAtlasCountrySet() {
  return getAtlasSetDefinition().kind === "countries";
}

export function isAtlasAnswer(place, query) {
  const normalizedQuery = normalize(query);
  return [place.name, ...(place.aliases || [])].some((answer) => normalize(answer) === normalizedQuery);
}

export function clearAtlasAdvanceTimer() {
  if (state.atlasAdvanceTimer) {
    window.clearTimeout(state.atlasAdvanceTimer);
    state.atlasAdvanceTimer = null;
  }
}

export function showAtlasCountryBoard() {
  state.target = null;
  state.atlasAnswered = false;
  state.finished = false;
  elements.atlasMapShell.classList.remove("is-hidden");
  elements.atlasHeading.textContent = getAtlasMapHeading();
  elements.countryInput.value = "";
  clearSpellingCorrection();
  setRoundInteractivity(true);
  updateModeUI();
  updateStatus(`Name all ${state.atlasQueue.length} countries by typing their names.`);
  renderGuesses();
  renderAtlasCountryMap();
  elements.countryInput.focus();
}

export function showAtlasTarget() {
  state.target = state.atlasQueue[state.atlasIndex];
  state.atlasAnswered = false;
  state.finished = false;
  elements.atlasMapShell.classList.remove("is-hidden");
  elements.atlasHeading.textContent = getAtlasSetDefinition().label;
  elements.atlasPosition.textContent = `${state.atlasIndex + 1} / ${state.atlasQueue.length}`;
  elements.countryInput.value = "";
  clearSpellingCorrection();
  setRoundInteractivity(true);
  updateModeUI();
  updateStatus(`Map ${state.atlasIndex + 1} of ${state.atlasQueue.length}. Name the highlighted area.`);
  renderGuesses();
  renderAtlasCountryMap();
  elements.countryInput.focus();
}

export function startAtlasSession() {
  clearAtlasAdvanceTimer();
  startGameTimer();
  const places = getAtlasPlacesForSet();

  if (!places.length) {
    updateStatus("This study set could not be loaded.", "failure");
    setRoundInteractivity(false);
    return;
  }

  state.atlasQueue = getAtlasSetDefinition().kind === "countries" ? places : shuffle(places);
  state.atlasIndex = 0;
  state.guesses = [];
  state.atlasShowRemaining = false;
  state.atlasSelectedCountryCode = null;

  if (isAtlasCountrySet()) {
    showAtlasCountryBoard();
    return;
  }

  showAtlasTarget();
}

export function completeAtlasSet() {
  clearAtlasAdvanceTimer();
  state.finished = true;
  stopGameTimer();
  state.atlasAnswered = true;
  state.atlasShowRemaining = false;
  state.atlasSelectedCountryCode = null;
  elements.countryInput.value = "";
  setRoundInteractivity(false);
  updateModeUI();
  const namedCount = state.guesses.filter((guess) => guess.correct).length;
  const revealedCount = state.guesses.length - namedCount;
  updateStatus(
    `Set complete: ${namedCount} named${revealedCount ? `, ${revealedCount} revealed` : ""}.`,
    revealedCount ? "default" : "success"
  );
  renderGuesses();
  updateAtlasCountryMapStyles();
  launchConfetti();
}

export function advanceAtlas() {
  clearAtlasAdvanceTimer();
  if (state.gameType !== "atlas" || state.finished || isAtlasCountrySet()) {
    return;
  }

  if (state.atlasIndex >= state.atlasQueue.length - 1) {
    completeAtlasSet();
    return;
  }

  state.atlasIndex += 1;
  showAtlasTarget();
}

export function submitAtlasGuess(rawValue) {
  if (isAtlasCountrySet()) {
    submitAtlasCountryGuess(rawValue);
    return;
  }

  if (state.atlasAnswered) {
    return;
  }

  if (!normalize(rawValue)) {
    updateStatus("Type the highlighted area's name first.", "failure");
    return;
  }

  if (!isAtlasAnswer(state.target, rawValue)) {
    offerSpellingCorrection(
      rawValue,
      `${rawValue.trim()} is not the highlighted area. Try again or reveal it.`
    );
    return;
  }

  state.guesses.push({
    name: state.target.name,
    id: state.target.id,
    number: state.atlasIndex + 1,
    correct: true
  });
  state.atlasAnswered = true;
  elements.countryInput.value = state.target.name;
  setRoundInteractivity(false);
  updateModeUI();
  updateStatus(`Correct — ${state.target.name}.`, "success");
  renderGuesses();
  state.atlasAdvanceTimer = window.setTimeout(advanceAtlas, 1100);
}

export function submitAtlasCountryGuess(rawValue) {
  const country = findCountry(rawValue);

  if (!country) {
    offerSpellingCorrection(rawValue, "That country name wasn’t recognized. Check the spelling and try again.");
    return;
  }

  const place = getAtlasCountryPlaceByCode(country.code);
  if (!place) {
    const setName = getAtlasMapHeading().replace(/ map$/i, "");
    updateStatus(`${country.name} is not part of the ${setName} set. Try another country.`, "failure");
    return;
  }

  const completed = state.guesses.find((guess) => guess.id === place.id);
  if (completed) {
    updateStatus(`${place.name} is already ${completed.correct ? "named" : "revealed"}. Choose another country.`, "failure");
    return;
  }

  state.guesses.push({
    name: place.name,
    id: place.id,
    code: place.code,
    number: state.guesses.length + 1,
    correct: true
  });
  if (state.atlasSelectedCountryCode === country.code) {
    state.atlasSelectedCountryCode = null;
  }
  state.target = null;
  elements.countryInput.value = "";
  clearSpellingCorrection();
  renderGuesses();
  updateAtlasCountryMapEntry(country.code, state.guesses[state.guesses.length - 1]);
  panAtlasToCountry(country.code);

  if (state.guesses.length >= state.atlasQueue.length) {
    completeAtlasSet();
    return;
  }

  updateStatus(`Correct — ${place.name}. Keep going.`, "success");
  elements.countryInput.focus();
}

export function revealAtlasCountryByCode(code) {
  if (!code || state.finished) {
    return;
  }

  const place = getAtlasCountryPlaceByCode(code);
  if (!place) {
    updateStatus("That country is outside this study set.", "failure");
    return;
  }

  if (state.guesses.some((guess) => guess.id === place.id)) {
    updateStatus(`${place.name} is already on your map.`, "default");
    return;
  }

  state.guesses.push({
    name: place.name,
    id: place.id,
    code: place.code,
    number: state.guesses.length + 1,
    correct: false
  });
  updateStatus(`${place.name} revealed. Keep typing any country you know.`, "default");
  renderGuesses();
  updateAtlasCountryMapEntry(code, state.guesses[state.guesses.length - 1]);

  if (state.guesses.length >= state.atlasQueue.length) {
    completeAtlasSet();
  }
}

export function selectAtlasCountry(code) {
  if (!code || state.finished || !isAtlasCountrySet()) {
    return;
  }

  const place = getAtlasCountryPlaceByCode(code);
  if (!place || state.guesses.some((guess) => guess.id === place.id)) {
    state.atlasSelectedCountryCode = null;
    updateAtlasCountryMapStyles();
    return;
  }

  state.atlasSelectedCountryCode = code;
  elements.atlasMapSelection.textContent = "Country selected — reveal it only if you want the answer.";
  updateAtlasCountryMapStyles();
}

export function revealAtlasAnswer() {
  if (isAtlasCountrySet()) {
    giveUpAtlasCountrySet();
    return;
  }

  clearAtlasAdvanceTimer();
  state.guesses.push({
    name: state.target.name,
    id: state.target.id,
    number: state.atlasIndex + 1,
    correct: false
  });
  state.atlasAnswered = true;
  elements.countryInput.value = state.target.name;
  setRoundInteractivity(false);
  updateModeUI();
  updateStatus(`The highlighted area is ${state.target.name}.`, "default");
  renderGuesses();
  elements.newGameButton.focus();
}

export function giveUpAtlasCountrySet() {
  if (state.finished) {
    return;
  }

  const completedIds = new Set(state.guesses.map((guess) => guess.id));
  const remainingPlaces = state.atlasQueue.filter((place) => !completedIds.has(place.id));

  remainingPlaces.forEach((place) => {
    state.guesses.push({
      name: place.name,
      id: place.id,
      code: place.code,
      number: state.guesses.length + 1,
      correct: false
    });
  });

  const namedCount = state.guesses.filter((guess) => guess.correct).length;
  state.finished = true;
  stopGameTimer();
  state.atlasAnswered = true;
  state.atlasShowRemaining = false;
  state.atlasSelectedCountryCode = null;
  state.target = null;
  elements.countryInput.value = "";
  clearCountrySuggestions();
  clearSpellingCorrection();
  setRoundInteractivity(false);
  updateModeUI();
  updateStatus(`You named ${namedCount} of ${state.atlasQueue.length} countries. The rest are now revealed.`);
  renderGuesses();
  updateAtlasCountryMapStyles();
  elements.newGameButton.focus();
}
