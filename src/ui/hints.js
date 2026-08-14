import { elements, hintView, state } from "../core/state.js";
import { saveSelection } from "../core/storage.js";
import { getCapitalHintsForCode } from "../games/capitals.js";

export function isHintGameType() {
  return state.gameType === "flag" || state.gameType === "globe";
}

export function showHintAt(index) {
  hintView.index = index;
  renderSidebarHints();
}

export function renderSidebarHints() {
  if (!elements.sidebarHints) {
    return;
  }

  const show = isHintGameType() && state.hintsEnabled;
  elements.sidebarHints.classList.toggle("is-hidden", !show);
  if (!show) {
    return;
  }

  const targetCode = state.target?.code || null;
  const hints = targetCode ? getCapitalHintsForCode(targetCode) : [];
  const total = hints.length;
  const wrongGuesses = state.guesses.filter((guess) => !guess.correct).length;
  const unlocked = Math.min(total, wrongGuesses);

  if (targetCode !== hintView.targetCode) {
    hintView.targetCode = targetCode;
    hintView.unlocked = unlocked;
    hintView.index = unlocked - 1;
  } else if (unlocked !== hintView.unlocked) {
    const isNewUnlock = unlocked > hintView.unlocked;
    hintView.unlocked = unlocked;
    hintView.index = unlocked - 1;
    if (isNewUnlock && !state.finished && elements.hintCard) {
      elements.hintCard.classList.remove("hint-pop");
      void elements.hintCard.offsetWidth;
      elements.hintCard.classList.add("hint-pop");
    }
  }
  if (hintView.index >= unlocked) {
    hintView.index = unlocked - 1;
  }

  elements.hintsDots.innerHTML = "";
  for (let index = 0; index < total; index += 1) {
    const dot = document.createElement("button");
    dot.type = "button";
    const isUnlocked = index < unlocked;
    dot.className = `hint-dot${isUnlocked ? " unlocked" : ""}${index === hintView.index ? " current" : ""}`;
    dot.setAttribute("aria-label", `Hint ${index + 1}${isUnlocked ? "" : " (locked)"}`);
    dot.disabled = !isUnlocked;
    if (isUnlocked) {
      dot.addEventListener("click", () => showHintAt(index));
    }
    elements.hintsDots.appendChild(dot);
  }

  const current = hintView.index;
  const hasHint = current >= 0;
  elements.hintCard.classList.toggle("empty", !hasHint);
  elements.hintCardNumber.innerHTML = hasHint ? String(current + 1) : "&ndash;";
  elements.hintCardText.textContent = hasHint
    ? hints[current]
    : total ? "Each wrong guess unlocks a hint." : "No hints available for this round.";
  elements.hintPrevButton.disabled = current <= 0;
  elements.hintNextButton.disabled = current >= unlocked - 1;
}

export function setHintsEnabled(enabled) {
  if (state.hintsEnabled === enabled) {
    return;
  }
  state.hintsEnabled = enabled;
  saveSelection();
  elements.hintsOffButton.classList.toggle("active", !enabled);
  elements.hintsOnButton.classList.toggle("active", enabled);
  renderSidebarHints();
}
