import { countries, getFlagUrl, pickRandomCountry } from "../core/catalog.js";
import { COUNTRY_REGION_BY_CODE, MAX_GUESSES } from "../core/constants.js";
import { elements, state } from "../core/state.js";
import { getCapitalHints } from "../core/loaders.js";
import { finishRound } from "../round.js";
import { renderGuesses, updateStatus } from "../ui/board.js";
import { launchConfetti } from "../ui/confetti.js";
import { playCorrectSound } from "../ui/settings.js";
import { clearSpellingCorrection } from "../ui/suggest.js";
import { saveRoundProgress } from "../core/progress.js";

export function getCapitalForCode(code) {
  return getCapitalHints()?.[code]?.capital || "";
}

export function getCapitalHintsForCode(code) {
  return getCapitalHints()?.[code]?.hints || [];
}

export function getCapitalScopeCountries() {
  const region = state.capitalsRegion;
  if (!region || region === "world") {
    return countries;
  }
  return countries.filter((country) => COUNTRY_REGION_BY_CODE.get(country.code) === region);
}

export function getCapitalCandidates() {
  const scope = state.playMode === "unlimited" ? getCapitalScopeCountries() : countries;
  return scope
    .map((country) => {
      const capital = getCapitalForCode(country.code);
      if (!capital) {
        return null;
      }
      return { name: capital, code: country.code, aliases: [] };
    })
    .filter(Boolean);
}

export function pickCapitalTarget() {
  const scope = getCapitalScopeCountries().filter((country) => getCapitalForCode(country.code));
  if (!scope.length) {
    return countries.find((country) => getCapitalForCode(country.code)) || pickRandomCountry();
  }
  return scope[Math.floor(Math.random() * scope.length)];
}

export function renderCapitalStage() {
  if (!state.target) {
    return;
  }
  if (elements.capitalCountryName) {
    elements.capitalCountryName.textContent = state.target.name;
  }
  if (elements.capitalFlagImage) {
    elements.capitalFlagImage.src = getFlagUrl(state.target.code);
    elements.capitalFlagImage.alt = `${state.target.name} flag`;
  }
}

export function submitCapitalGuess(country) {
  const correct = country.code === state.target.code;
  state.guesses.push({
    name: country.name,
    code: country.code,
    correct
  });

  if (correct) {
    finishRound(`Yea, it's done. You named the capital.`, "success");
    launchConfetti();
    playCorrectSound();
    return;
  }

  if (state.guesses.length >= MAX_GUESSES) {
    finishRound(
      `Round over. You used all ${MAX_GUESSES} guesses.`,
      "failure"
    );
    return;
  }

  updateStatus(`${country.name} is not the capital. Try again.`, "default");
  elements.countryInput.value = "";
  clearSpellingCorrection();
  saveRoundProgress();
  renderGuesses();
}

export function giveUpCapitals() {
  state.finishReason = "gave-up";
  finishRound("You gave up. The capital is revealed on the guess board.", "failure");
}
