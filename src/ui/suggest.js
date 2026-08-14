import { getSpellingCorrection } from "../core/catalog.js";
import { elements, state } from "../core/state.js";
import { updateStatus } from "./board.js";

export function syncInputAssistanceState() {
  const expanded = state.countrySuggestions.length > 0 || Boolean(state.suggestedCorrection);
  elements.countryInput.setAttribute("aria-expanded", String(expanded));
}

export function renderCountrySuggestions() {
  elements.countrySuggestions.innerHTML = "";

  if (!state.countrySuggestions.length || state.gameType === "atlas" || state.finished) {
    elements.countrySuggestions.classList.remove("visible");
    elements.countryInput.removeAttribute("aria-activedescendant");
    syncInputAssistanceState();
    return;
  }

  state.countrySuggestions.forEach((country, index) => {
    const item = document.createElement("li");
    item.className = "country-suggestion-item";
    item.textContent = country.name;
    item.id = `country-suggestion-${country.code}`;
    item.setAttribute("role", "option");
    item.setAttribute("aria-selected", String(index === state.highlightedSuggestionIndex));

    if (index === state.highlightedSuggestionIndex) {
      item.classList.add("active");
      elements.countryInput.setAttribute("aria-activedescendant", item.id);
    }

    item.addEventListener("mousedown", (event) => {
      event.preventDefault();
      acceptCountrySuggestion(country);
    });
    elements.countrySuggestions.appendChild(item);
  });

  if (state.highlightedSuggestionIndex < 0) {
    elements.countryInput.removeAttribute("aria-activedescendant");
  }

  elements.countrySuggestions.classList.add("visible");
  syncInputAssistanceState();
}

export function renderSpellingCorrection() {
  elements.spellingSuggestion.innerHTML = "";

  if (!state.suggestedCorrection || state.finished) {
    elements.spellingSuggestion.classList.remove("visible");
    syncInputAssistanceState();
    return;
  }

  const correction = state.suggestedCorrection;
  const button = document.createElement("button");
  const prompt = document.createElement("span");
  const name = document.createElement("strong");

  button.type = "button";
  button.className = "spelling-suggestion-button";
  prompt.textContent = "Did you mean";
  name.textContent = `${correction.name}?`;
  button.append(prompt, name);
  button.addEventListener("mousedown", (event) => {
    event.preventDefault();
  });
  button.addEventListener("click", () => acceptSpellingCorrection(correction));

  elements.spellingSuggestion.appendChild(button);
  elements.spellingSuggestion.classList.add("visible");
  syncInputAssistanceState();
}

export function clearCountrySuggestions() {
  state.countrySuggestions = [];
  state.highlightedSuggestionIndex = -1;
  renderCountrySuggestions();
}

export function stepCountrySuggestion(direction) {
  if (!state.countrySuggestions.length) {
    return;
  }

  state.highlightedSuggestionIndex = state.highlightedSuggestionIndex < 0
    ? direction > 0 ? 0 : state.countrySuggestions.length - 1
    : (state.highlightedSuggestionIndex + direction + state.countrySuggestions.length)
      % state.countrySuggestions.length;
  renderCountrySuggestions();
}

export function acceptCountrySuggestion(country) {
  elements.countryInput.value = country.name;
  clearCountrySuggestions();
  elements.countryInput.focus();
}

export function clearSpellingCorrection() {
  state.suggestedCorrection = null;
  renderSpellingCorrection();
}

export function acceptSpellingCorrection(place) {
  elements.countryInput.value = place.name;
  clearSpellingCorrection();
  elements.countryInput.focus();
}

export function offerSpellingCorrection(query, fallbackMessage) {
  clearCountrySuggestions();
  state.suggestedCorrection = getSpellingCorrection(query);
  renderSpellingCorrection();
  updateStatus(
    state.suggestedCorrection
      ? "That name wasn’t recognized. Check the spelling suggestion below."
      : fallbackMessage,
    "failure"
  );
}
