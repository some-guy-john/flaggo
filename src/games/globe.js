import { calculateDistanceKm, formatDistance, getHeatClass } from "../core/geo.js";
import { elements, state } from "../core/state.js";
import { queueGlobeRender, rotateGlobeToCountry } from "../map/globe.js";
import { finishRound } from "../round.js";
import { renderGuesses, updateStatus } from "../ui/board.js";
import { launchConfetti } from "../ui/confetti.js";
import { playCorrectSound } from "../ui/settings.js";
import { clearSpellingCorrection } from "../ui/suggest.js";
import { saveRoundProgress } from "../core/progress.js";

export function submitGlobeGuess(country) {
  const correct = country.code === state.target.code;

  if (correct) {
    state.guesses.push({
      name: country.name,
      code: country.code,
      correct: true
    });
    rotateGlobeToCountry(country.code);
    finishRound(`Yea, it's done. You found the country: ${state.target.name}.`, "success");
    launchConfetti();
    playCorrectSound();
    return;
  }

  const from = state.centroids.get(country.code);
  const to = state.centroids.get(state.target.code);

  if (!from || !to) {
    updateStatus("This country is missing coordinates, so globe mode cannot score it yet.", "failure");
    return;
  }

  const distanceKm = calculateDistanceKm(from, to);
  const heatClass = getHeatClass(distanceKm);

  state.guesses.push({
    name: country.name,
    code: country.code,
    correct: false,
    distanceKm,
    heatClass
  });

  rotateGlobeToCountry(country.code);
  updateStatus(`${country.name} is ${formatDistance(distanceKm)}.`, heatClass === "hot" ? "success" : "default");
  elements.countryInput.value = "";
  clearSpellingCorrection();
  saveRoundProgress();
  renderGuesses();
  queueGlobeRender();
}

export function giveUpGlobe() {
  state.finishReason = "gave-up";
  rotateGlobeToCountry(state.target.code);
  finishRound(`You gave up. The country was ${state.target.name}.`, "failure");
}
