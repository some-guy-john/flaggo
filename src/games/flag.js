import { MAX_GUESSES } from "../core/constants.js";
import { elements, state } from "../core/state.js";
import { finishRound } from "../round.js";
import { renderGuesses, revealNextTile, updateStatus } from "../ui/board.js";
import { launchConfetti } from "../ui/confetti.js";
import { playCorrectSound } from "../ui/settings.js";
import { clearSpellingCorrection } from "../ui/suggest.js";
import { saveRoundProgress } from "../core/progress.js";

export function submitFlagGuess(country) {
  const correct = country.code === state.target.code;
  state.guesses.push({
    name: country.name,
    code: country.code,
    correct
  });
  revealNextTile();

  if (correct) {
    finishRound(`Yea, it's done. You nailed it. That flag is ${state.target.name}.`, "success");
    launchConfetti();
    playCorrectSound();
    return;
  }

  if (state.guesses.length >= MAX_GUESSES) {
    finishRound(`Round over. You used all 6 guesses. The flag was ${state.target.name}.`, "failure");
    return;
  }

  updateStatus(`${country.name} is not it. One more tile opened.`, "default");
  elements.countryInput.value = "";
  clearSpellingCorrection();
  saveRoundProgress();
  renderGuesses();
}

export function giveUpFlag() {
  state.finishReason = "gave-up";
  finishRound("You gave up. The answer is revealed on the guess board.", "failure");
}
