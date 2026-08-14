import { PALETTES, THEME_STORAGE_KEY } from "../core/constants.js";
import { elements, state } from "../core/state.js";

export function applyPalette(name) {
  state.palette = name;
  const theme = document.documentElement.dataset.theme || 'light';
  const vars = PALETTES[name]?.[theme] || PALETTES.sage[theme];
  const root = document.documentElement.style;
  Object.entries(vars).forEach(([k, v]) => root.setProperty(k, v));
  document.querySelectorAll('.palette-card').forEach(c => {
    const selected = c.dataset.palette === name;
    c.classList.toggle('selected', selected);
    c.setAttribute('aria-pressed', String(selected));
  });
  localStorage.setItem('flaggo-palette', name);
}

export function initPalette() {
  const saved = localStorage.getItem('flaggo-palette');
  const name = PALETTES[saved] ? saved : 'sage';
  applyPalette(name);
}

export function applyTheme(theme) {
  const normalizedTheme = theme === "dark" ? "dark" : "light";
  const toggleLabel = normalizedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode";
  document.documentElement.dataset.theme = normalizedTheme;
  elements.themeToggle.setAttribute("aria-pressed", String(normalizedTheme === "dark"));
  elements.themeToggle.setAttribute("aria-label", toggleLabel);
  elements.themeToggleLabel.textContent = toggleLabel;

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, normalizedTheme);
  } catch {
    // Theme still applies for the current session.
  }

  applyPalette(state.palette);
}

export function toggleTheme() {
  applyTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
}
