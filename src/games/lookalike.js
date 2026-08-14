import { countries, getFlagUrl, pickRandomCountry } from "../core/catalog.js";
import { elements, state } from "../core/state.js";
import { LOOKALIKE_GROUPS } from "../data/lookalikes.js";
import { renderGuesses } from "../ui/board.js";
import { launchConfetti } from "../ui/confetti.js";
import { playCorrectSound } from "../ui/settings.js";
import { saveTrickyBest } from "../core/stats.js";

export function startLookalikeRound() {
  if (!LOOKALIKE_GROUPS || !LOOKALIKE_GROUPS.length) {
    return;
  }

  state.lookalikeAnswered = false;
  const groups = LOOKALIKE_GROUPS.filter((group) => group.codes.length >= 2);
  if (!groups.length) {
    return;
  }

  const group = groups[Math.floor(Math.random() * groups.length)];
  state.lookalikeGroup = group;

  const shuffledCodes = [...group.codes].sort(() => Math.random() - 0.5);
  state.target = countries.find((c) => c.code === shuffledCodes[0]) || pickRandomCountry();

  elements.lookalikeCountryName.textContent = state.target.name;
  elements.lookalikeFlagsGrid.innerHTML = "";

  shuffledCodes.forEach((code) => {
    const country = countries.find((c) => c.code === code);
    if (!country) {
      return;
    }

    const flagCard = document.createElement("button");
    flagCard.className = "lookalike-flag-card";
    flagCard.type = "button";
    flagCard.setAttribute("aria-label", `Flag option ${elements.lookalikeFlagsGrid.children.length + 1}`);

    const img = document.createElement("img");
    img.className = "lookalike-flag-image";
    img.src = getFlagUrl(code);
    img.alt = "Flag option";
    img.draggable = false;

    flagCard.appendChild(img);
    flagCard.addEventListener("click", () => handleLookalikePick(code, flagCard));
    elements.lookalikeFlagsGrid.appendChild(flagCard);
  });

  updateLookalikeScore();
}

export function handleLookalikePick(code, cardElement) {
  if (state.lookalikeAnswered || state.finished) {
    return;
  }

  state.lookalikeAnswered = true;
  state.lookalikeScore.total += 1;

  const isCorrect = code === state.target.code;
  const allCards = elements.lookalikeFlagsGrid.querySelectorAll(".lookalike-flag-card");

  if (isCorrect) {
    state.lookalikeScore.correct += 1;
    state.lookalikeScore.streak += 1;
    if (state.lookalikeScore.streak > state.lookalikeScore.bestStreak) {
      state.lookalikeScore.bestStreak = state.lookalikeScore.streak;
      saveTrickyBest(state.lookalikeScore.bestStreak);
    }
    cardElement.classList.add("correct");
    launchConfetti();
    playCorrectSound();
  } else {
    state.lookalikeScore.streak = 0;
    cardElement.classList.add("incorrect");

    allCards.forEach((card) => {
      const cardImg = card.querySelector("img");
      if (cardImg) {
        const cardCode = cardImg.src.split("/").pop().replace(".png", "");
        if (cardCode === state.target.code) {
          card.classList.add("correct");
        }
      }
    });
  }

  state.guesses.push({
    name: countries.find((c) => c.code === code)?.name || code,
    code,
    correct: isCorrect
  });

  updateLookalikeScore();
  renderGuesses();

  state.lookalikeAdvanceTimer = window.setTimeout(() => {
    state.lookalikeAdvanceTimer = null;
    if (state.gameType === "lookalike" && !state.finished) {
      startLookalikeRound();
    }
  }, 1100);
}

export function updateLookalikeScore() {
  const { correct, total, streak, bestStreak } = state.lookalikeScore;
  elements.historyCount.textContent = `${correct} / ${total} correct · Streak ${streak} · Best ${bestStreak}`;
}
