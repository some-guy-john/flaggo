import { elements, state } from "./state.js";

export function formatElapsedTime(milliseconds) {
  const elapsedSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function updateGameTimer() {
  const elapsed = state.timerStartedAt ? Date.now() - state.timerStartedAt : 0;
  elements.gameTimer.value = formatElapsedTime(elapsed);
  elements.gameTimer.textContent = elements.gameTimer.value;
}

export function startGameTimer() {
  window.clearInterval(state.timerInterval);
  state.timerStartedAt = Date.now();
  updateGameTimer();
  state.timerInterval = window.setInterval(updateGameTimer, 1000);
}

export function stopGameTimer() {
  window.clearInterval(state.timerInterval);
  state.timerInterval = null;
  updateGameTimer();
}
