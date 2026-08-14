import { refreshCountryCatalog } from "./catalog.js";
import { ATLAS_SET_IDS, CAPITALS_REGIONS, MODE_STORAGE_KEY, RECOGNITION_STORAGE_KEY, THEME_STORAGE_KEY } from "./constants.js";
import { elements, state } from "./state.js";
import { startAtlasSession } from "../games/atlas.js";
import { loadAtlasCountries } from "../map/data.js";
import { startGame } from "../round.js";

export function initSoundSettings() {
  const saved = localStorage.getItem("flaggo-sound");
  state.soundEnabled = saved !== "false";
}

export function getSavedSelection() {
  try {
    const raw = window.localStorage.getItem(MODE_STORAGE_KEY);

    if (!raw) {
      return { gameType: "flag", playMode: "daily", atlasSet: "world" };
    }

    const parsed = JSON.parse(raw);
    const gameType = ["flag", "globe", "atlas", "capitals", "lookalike"].includes(parsed?.gameType) ? parsed.gameType : "flag";
    const playMode = parsed?.playMode === "unlimited" ? "unlimited" : "daily";
    const atlasSet = ATLAS_SET_IDS.has(parsed?.atlasSet) ? parsed.atlasSet : "world";
    const capitalsRegion = CAPITALS_REGIONS.has(parsed?.capitalsRegion) ? parsed.capitalsRegion : "world";
    const hintsEnabled = parsed?.hintsEnabled === true;

    return { gameType, playMode, atlasSet, capitalsRegion, hintsEnabled };
  } catch {
    return { gameType: "flag", playMode: "daily", atlasSet: "world", capitalsRegion: "world", hintsEnabled: false };
  }
}

export function saveSelection() {
  try {
    window.localStorage.setItem(
      MODE_STORAGE_KEY,
      JSON.stringify({
        gameType: state.gameType,
        playMode: state.playMode,
        atlasSet: state.atlasSet,
        capitalsRegion: state.capitalsRegion,
        hintsEnabled: state.hintsEnabled
      })
    );
  } catch {
    // Ignore storage failures and continue with in-memory state.
  }
}

export function getSavedTheme() {
  try {
    const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);

    if (savedTheme === "dark" || savedTheme === "light") {
      return savedTheme;
    }
  } catch {
    // Ignore storage failures and fall back to the system preference.
  }

  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function initRecognitionOptions() {
  try {
    const saved = JSON.parse(localStorage.getItem(RECOGNITION_STORAGE_KEY));
    if (saved && typeof saved === "object") {
      state.recognitionOptions.taiwan = Boolean(saved.taiwan);
      state.recognitionOptions.kosovo = Boolean(saved.kosovo);
    }
  } catch {
    // Use the default country list when older or malformed storage is found.
  }

  const sync = () => {
    elements.includeTaiwan.checked = state.recognitionOptions.taiwan;
    elements.includeKosovo.checked = state.recognitionOptions.kosovo;
  };
  const save = () => {
    localStorage.setItem(RECOGNITION_STORAGE_KEY, JSON.stringify(state.recognitionOptions));
    refreshCountryCatalog();
    loadAtlasCountries();
    if (state.gameType === "atlas") {
      startAtlasSession();
    } else {
      startGame();
    }
  };

  sync();
  refreshCountryCatalog();
  elements.includeTaiwan.addEventListener("change", (event) => {
    state.recognitionOptions.taiwan = event.target.checked;
    save();
  });
  elements.includeKosovo.addEventListener("change", (event) => {
    state.recognitionOptions.kosovo = event.target.checked;
    save();
  });
}

export function initSoundToggle() {
  const sync = () => {
    elements.soundToggle.checked = state.soundEnabled;
  };
  const save = () => {
    localStorage.setItem("flaggo-sound", state.soundEnabled ? "true" : "false");
  };

  sync();
  elements.soundToggle.addEventListener("change", (event) => {
    state.soundEnabled = event.target.checked;
    save();
  });
}
