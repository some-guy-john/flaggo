const countries = [...window.COUNTRIES].sort((a, b) => a.name.localeCompare(b.name));
const countryByCode = new Map(countries.map((country) => [country.code, country]));

const MAX_GUESSES = 6;
const TOTAL_TILES = 6;
const MODE_STORAGE_KEY = "flaggo-mode-v2";
const THEME_STORAGE_KEY = "flaggo-theme";
const HEAT_BANDS_KM = {
  hot: 250,
  warm: 1000
};
const GLOBE_ZOOM_MIN = 0.7;
const GLOBE_ZOOM_MAX = 3.2;
const GLOBE_ZOOM_BUTTON_STEP = 0.25;
const MAP_FEATURE_CODE_OVERRIDES = new Map([
  ["France", "fr"],
  ["Norway", "no"]
]);
const ATLAS_SETS = [
  { id: "world", label: "All 195 countries", kind: "countries", region: null },
  { id: "africa", label: "All countries in Africa", kind: "countries", region: "africa" },
  { id: "asia", label: "All countries in Asia", kind: "countries", region: "asia" },
  { id: "europe", label: "All countries in Europe", kind: "countries", region: "europe" },
  { id: "north-america", label: "All countries in North America", kind: "countries", region: "north-america" },
  { id: "south-america", label: "All countries in South America", kind: "countries", region: "south-america" },
  { id: "oceania", label: "All countries in Oceania", kind: "countries", region: "oceania" },
  { id: "oceans-seas", label: "Oceans & major seas", kind: "waters" },
  { id: "continents", label: "The seven continents", kind: "continents" }
];
const ATLAS_SET_IDS = new Set(ATLAS_SETS.map((set) => set.id));
const COUNTRY_REGION_BY_CODE = new Map([
  ["africa", "ao bf bi bj bw cd cf cg ci cm cv dj dz eg er et ga gh gm gn gq gw ke km lr ls ly ma mg ml mr mu mw mz na ne ng rw sc sd sl sn so ss st sz td tg tn tz ug za zm zw"],
  ["asia", "ae af am az bd bh bn bt cn ge id il in iq ir jo jp kg kh kp kr kw kz la lb lk mm mn mv my np om ph pk ps qa sa sg sy th tj tl tm tr uz vn ye"],
  ["europe", "ad al at ba be bg by ch cy cz de dk ee es fi fr gb gr hr hu ie is it li lt lu lv mc md me mk mt nl no pl pt ro rs ru se si sk sm ua va"],
  ["north-america", "ag bb bs bz ca cr cu dm do gd gt hn ht jm kn lc mx ni pa sv tt us vc"],
  ["oceania", "au fj fm ki mh nr nz pg pw sb to tv vu ws"],
  ["south-america", "ar bo br cl co ec gy pe py sr uy ve"]
].flatMap(([region, codes]) => codes.split(" ").map((code) => [code, region])));
const ATLAS_PHYSICAL_PLACES = [
  { id: "gulf_of_mexico", name: "Gulf of Mexico", kind: "waters", aliases: [] },
  { id: "philippine_sea", name: "Philippine Sea", kind: "waters", aliases: [] },
  { id: "southern_ocean", name: "Southern Ocean", kind: "waters", aliases: ["antarctic ocean"] },
  { id: "gulf_of_thailand", name: "Gulf of Thailand", kind: "waters", aliases: [] },
  { id: "pacific_ocean", name: "Pacific Ocean", kind: "waters", aliases: [] },
  { id: "atlantic_ocean", name: "Atlantic Ocean", kind: "waters", aliases: [] },
  { id: "indian_ocean", name: "Indian Ocean", kind: "waters", aliases: [] },
  { id: "arctic_ocean", name: "Arctic Ocean", kind: "waters", aliases: [] },
  { id: "hudson_bay", name: "Hudson Bay", kind: "waters", aliases: [] },
  { id: "labrador_sea", name: "Labrador Sea", kind: "waters", aliases: [] },
  { id: "white_sea", name: "White Sea", kind: "waters", aliases: [] },
  { id: "denmark_strait", name: "Denmark Strait", kind: "waters", aliases: [] },
  { id: "norwegian_sea", name: "Norwegian Sea", kind: "waters", aliases: [] },
  { id: "baltic_sea", name: "Baltic Sea", kind: "waters", aliases: [] },
  { id: "celtic_sea", name: "Celtic Sea", kind: "waters", aliases: [] },
  { id: "english_channel", name: "English Channel", kind: "waters", aliases: ["la manche"] },
  { id: "adriatic_sea", name: "Adriatic Sea", kind: "waters", aliases: [] },
  { id: "bay_of_biscay", name: "Bay of Biscay", kind: "waters", aliases: [] },
  { id: "black_sea", name: "Black Sea", kind: "waters", aliases: [] },
  { id: "aegean_sea", name: "Aegean Sea", kind: "waters", aliases: [] },
  { id: "caspian_sea", name: "Caspian Sea", kind: "waters", aliases: [] },
  { id: "mediterranean_sea", name: "Mediterranean Sea", kind: "waters", aliases: [] },
  { id: "east_siberian_sea", name: "East Siberian Sea", kind: "waters", aliases: [] },
  { id: "bering_strait", name: "Bering Strait", kind: "waters", aliases: [] },
  { id: "arabian_sea", name: "Arabian Sea", kind: "waters", aliases: [] },
  { id: "red_sea", name: "Red Sea", kind: "waters", aliases: [] },
  { id: "dead_sea", name: "Dead Sea", kind: "waters", aliases: [] },
  { id: "bay_of_bengal", name: "Bay of Bengal", kind: "waters", aliases: [] },
  { id: "sea_of_japan", name: "Sea of Japan", kind: "waters", aliases: ["east sea"] },
  { id: "yellow_sea", name: "Yellow Sea", kind: "waters", aliases: [] },
  { id: "coral_sea", name: "Coral Sea", kind: "waters", aliases: [] },
  { id: "south_china_sea", name: "South China Sea", kind: "waters", aliases: [] },
  { id: "tasman_sea", name: "Tasman Sea", kind: "waters", aliases: [] },
  { id: "gulf_of_carpentaria", name: "Gulf of Carpentaria", kind: "waters", aliases: [] },
  { id: "aral_sea", name: "Aral Sea", kind: "waters", aliases: [] },
  { id: "persian_gulf", name: "Persian Gulf", kind: "waters", aliases: ["arabian gulf"] },
  { id: "caribbean_sea", name: "Caribbean Sea", kind: "waters", aliases: [] },
  { id: "gulf_of_california", name: "Gulf of California", kind: "waters", aliases: ["sea of cortez", "sea of cortés"] },
  { id: "sea_of_galilee", name: "Sea of Galilee", kind: "waters", aliases: ["lake tiberias", "lake kinneret"] },
  { id: "banda_sea", name: "Banda Sea", kind: "waters", aliases: [] },
  { id: "barents_sea", name: "Barents Sea", kind: "waters", aliases: [] },
  { id: "celebes_sea", name: "Celebes Sea", kind: "waters", aliases: ["sulawesi sea"] },
  { id: "east_china_sea", name: "East China Sea", kind: "waters", aliases: [] },
  { id: "gulf_of_alaska", name: "Gulf of Alaska", kind: "waters", aliases: [] },
  { id: "gulf_of_guinea", name: "Gulf of Guinea", kind: "waters", aliases: [] },
  { id: "north_sea", name: "North Sea", kind: "waters", aliases: [] },
  { id: "sea_of_okhotsk", name: "Sea of Okhotsk", kind: "waters", aliases: [] },
  { id: "timor_sea", name: "Timor Sea", kind: "waters", aliases: [] },
  { id: "europe", name: "Europe", kind: "continents", aliases: [] },
  { id: "north_america", name: "North America", kind: "continents", aliases: [] },
  { id: "south_america", name: "South America", kind: "continents", aliases: [] },
  { id: "asia", name: "Asia", kind: "continents", aliases: [] },
  { id: "africa", name: "Africa", kind: "continents", aliases: [] },
  { id: "oceania", name: "Oceania", kind: "continents", aliases: [] },
  { id: "antarctica", name: "Antarctica", kind: "continents", aliases: [] }
];
const ATLAS_PHYSICAL_COORDINATES = new Map([
  ["gulf_of_mexico", [-90, 24]],
  ["philippine_sea", [134, 20]],
  ["southern_ocean", [0, -60]],
  ["gulf_of_thailand", [101, 9]],
  ["pacific_ocean", [-150, 0]],
  ["atlantic_ocean", [-30, 0]],
  ["indian_ocean", [80, -20]],
  ["arctic_ocean", [0, 82]],
  ["hudson_bay", [-85, 60]],
  ["labrador_sea", [-55, 57]],
  ["white_sea", [36.5, 65]],
  ["denmark_strait", [-28, 66]],
  ["norwegian_sea", [3, 68]],
  ["baltic_sea", [19, 58]],
  ["celtic_sea", [-8, 50]],
  ["english_channel", [-1.5, 50]],
  ["adriatic_sea", [15, 43]],
  ["bay_of_biscay", [-5, 46]],
  ["black_sea", [34, 44]],
  ["aegean_sea", [25, 39]],
  ["caspian_sea", [51, 42]],
  ["mediterranean_sea", [18, 35]],
  ["east_siberian_sea", [165, 72]],
  ["bering_strait", [-169, 66]],
  ["arabian_sea", [65, 15]],
  ["red_sea", [38, 20]],
  ["dead_sea", [35.5, 31.5]],
  ["bay_of_bengal", [88, 15]],
  ["sea_of_japan", [135, 40]],
  ["yellow_sea", [123, 35]],
  ["coral_sea", [155, -20]],
  ["south_china_sea", [115, 14]],
  ["tasman_sea", [160, -40]],
  ["gulf_of_carpentaria", [139, -15]],
  ["aral_sea", [60.5, 45]],
  ["persian_gulf", [51, 27]],
  ["caribbean_sea", [-75, 15]],
  ["gulf_of_california", [-110, 28]],
  ["sea_of_galilee", [35.6, 32.8]],
  ["banda_sea", [128, -5]],
  ["barents_sea", [40, 75]],
  ["celebes_sea", [122, 3]],
  ["east_china_sea", [125, 28]],
  ["gulf_of_alaska", [-145, 57]],
  ["gulf_of_guinea", [2, 1]],
  ["north_sea", [3, 56]],
  ["sea_of_okhotsk", [150, 53]],
  ["timor_sea", [127, -11]]
]);
const ATLAS_WATER_FALLBACK_AREAS = new Map([
  ["celtic_sea", [22, 14, -18]],
  ["bering_strait", [15, 22, 12]],
  ["dead_sea", [9, 18, -8]],
  ["aral_sea", [15, 12, 0]],
  ["sea_of_galilee", [8, 12, 0]]
]);

const state = {
  target: null,
  guesses: [],
  suggestedCorrection: null,
  finished: false,
  revealOrder: [],
  revealedTiles: 0,
  gameType: "flag",
  playMode: "daily",
  dailySchedules: {
    flag: { entries: [], lookup: new Map(), meta: null },
    globe: { entries: [], lookup: new Map(), meta: null }
  },
  dailyDateKey: null,
  centroids: new Map(),
  atlasFeatures: [],
  marineFeatureByName: new Map(),
  globeFeatures: [],
  globeRotation: [-20, -18, 0],
  globeZoom: 1,
  globeDragStart: null,
  globeRotationStart: null,
  globeDragging: false,
  globeRenderQueued: false,
  globeProjection: null,
  globePath: null,
  globeAnimationFrame: null,
  atlasCountries: [],
  atlasSet: "world",
  atlasQueue: [],
  atlasIndex: 0,
  atlasAnswered: false,
  atlasAdvanceTimer: null,
  atlasSelectedCode: null,
  atlasZoomBehavior: null,
  atlasMapLayer: null,
  atlasZoomFrame: null,
  atlasPendingTransform: null,
  palette: "sage"
};

const elements = {
  confettiCanvas: document.querySelector("#confetti-canvas"),
  flagGameButton: document.querySelector("#flag-game-button"),
  globleGameButton: document.querySelector("#globle-game-button"),
  atlasGameButton: document.querySelector("#atlas-game-button"),
  dailyModeButton: document.querySelector("#daily-mode-button"),
  unlimitedModeButton: document.querySelector("#unlimited-mode-button"),
  playModeSwitch: document.querySelector("#play-mode-switch"),
  atlasSetControl: document.querySelector("#atlas-set-control"),
  atlasSetSelect: document.querySelector("#atlas-set-select"),
  gameCenter: document.querySelector("#game-center"),
  atlasStage: document.querySelector("#atlas-stage"),
  atlasHeading: document.querySelector("#atlas-heading"),
  atlasMapShell: document.querySelector("#atlas-map-shell"),
  atlasMap: document.querySelector("#atlas-map"),
  atlasMapSelection: document.querySelector("#atlas-map-selection"),
  atlasZoomInButton: document.querySelector("#atlas-zoom-in"),
  atlasZoomOutButton: document.querySelector("#atlas-zoom-out"),
  atlasZoomResetButton: document.querySelector("#atlas-zoom-reset"),
  atlasPosition: document.querySelector("#atlas-position"),
  flagStage: document.querySelector("#flag-stage"),
  flagFrame: document.querySelector("#flag-stage .flag-frame"),
  globleStage: document.querySelector("#globle-stage"),
  flagImage: document.querySelector("#flag-image"),
  flagMask: document.querySelector("#flag-mask"),
  globlePanel: document.querySelector("#globle-panel"),
  globeCanvas: document.querySelector("#globe-canvas"),
  globeZoomInButton: document.querySelector("#globe-zoom-in"),
  globeZoomOutButton: document.querySelector("#globe-zoom-out"),
  pageTitle: document.querySelector("#page-title"),
  roundTitle: document.querySelector("#flag-title"),
  statusMessage: document.querySelector("#status-message"),
  guessForm: document.querySelector("#guess-form"),
  countryInputLabel: document.querySelector('label[for="country-input"]'),
  countryInput: document.querySelector("#country-input"),
  guessButton: document.querySelector("#guess-button"),
  inputHint: document.querySelector("#input-hint"),
  spellingSuggestion: document.querySelector("#spelling-suggestion"),
  guessList: document.querySelector("#guess-list"),
  guessesTitle: document.querySelector("#guesses-title"),
  historyCount: document.querySelector("#history-count"),
  newGameButton: document.querySelector("#new-game-button"),
  giveUpButton: document.querySelector("#give-up-button"),
  themeToggle: document.querySelector("#theme-toggle"),
  themeToggleLabel: document.querySelector("#theme-toggle-label"),
  settingsButton: document.querySelector("#settings-button"),
  modalOverlay: document.querySelector("#modal-overlay"),
  modalClose: document.querySelector("#modal-close")
};

const confetti = {
  pieces: [],
  animationFrame: null,
  endAt: 0,
  context: null
};

const PALETTES = {
  sage: {
    light: {'--bg':'#f4f5f2','--surface':'#fafaf7','--fg':'#2c302d','--muted':'#777c74','--border':'#e2e5df','--accent':'#6b8b7a','--accent-hover':'#557364','--accent-soft':'rgba(107,139,122,0.08)','--success':'#7aaa8a','--success-soft':'rgba(122,170,138,0.1)','--danger':'#c47a6b','--danger-soft':'rgba(196,122,107,0.08)','--warning':'#d4a56a','--heat-cold':'#98b7c5','--heat-warm':'#d4a56a','--heat-hot':'#c47a6b'},
    dark: {'--bg':'#1a1c19','--surface':'#242722','--fg':'#e4e6e0','--muted':'#92988b','--border':'#353830','--accent':'#8db8a0','--accent-hover':'#a3cdb5','--accent-soft':'rgba(141,184,160,0.12)','--success':'#8db89a','--success-soft':'rgba(141,184,154,0.12)','--danger':'#d99585','--danger-soft':'rgba(217,149,133,0.1)','--warning':'#e0b87c','--heat-cold':'#82a6b8','--heat-warm':'#e0b87c','--heat-hot':'#d99585'}
  },
  lavender: {
    light: {'--bg':'#f6f5f9','--surface':'#fdfcfd','--fg':'#2d2a35','--muted':'#7a7688','--border':'#e5e3ec','--accent':'#8b7d9e','--accent-hover':'#736588','--accent-soft':'rgba(139,125,158,0.08)','--success':'#8a9e8a','--success-soft':'rgba(138,158,138,0.1)','--danger':'#c47a7a','--danger-soft':'rgba(196,122,122,0.08)','--warning':'#c4a47a','--heat-cold':'#9a98c0','--heat-warm':'#c4a47a','--heat-hot':'#c47a7a'},
    dark: {'--bg':'#1c1a22','--surface':'#26242e','--fg':'#e5e3ec','--muted':'#9b96a8','--border':'#353340','--accent':'#ad9ec0','--accent-hover':'#c0b3d1','--accent-soft':'rgba(173,158,192,0.12)','--success':'#9ec0a2','--success-soft':'rgba(158,192,162,0.12)','--danger':'#d9a09a','--danger-soft':'rgba(217,160,154,0.1)','--warning':'#d9b89a','--heat-cold':'#a9a6cf','--heat-warm':'#d9b89a','--heat-hot':'#d9a09a'}
  },
  ochre: {
    light: {'--bg':'#faf7f2','--surface':'#fefdf9','--fg':'#3d3228','--muted':'#8a7a68','--border':'#ece5db','--accent':'#c4956a','--accent-hover':'#a87b52','--accent-soft':'rgba(196,149,106,0.08)','--success':'#899b6a','--success-soft':'rgba(137,155,106,0.1)','--danger':'#c47a6b','--danger-soft':'rgba(196,122,107,0.08)','--warning':'#c4a55a','--heat-cold':'#a0b8b0','--heat-warm':'#c4a55a','--heat-hot':'#c47a6b'},
    dark: {'--bg':'#1f1c17','--surface':'#2a2620','--fg':'#ebe5d8','--muted':'#a09880','--border':'#3d362d','--accent':'#d4a875','--accent-hover':'#e0bb90','--accent-soft':'rgba(212,168,117,0.12)','--success':'#a0b880','--success-soft':'rgba(160,184,128,0.12)','--danger':'#d9a090','--danger-soft':'rgba(217,160,144,0.1)','--warning':'#d9b878','--heat-cold':'#b0c5bb','--heat-warm':'#d9b878','--heat-hot':'#d9a090'}
  },
  ocean: {
    light: {'--bg':'#f4f6f8','--surface':'#fcfdfd','--fg':'#24333a','--muted':'#6b7d85','--border':'#dfe4e8','--accent':'#6b8e9e','--accent-hover':'#547586','--accent-soft':'rgba(107,142,158,0.08)','--success':'#7a9e8a','--success-soft':'rgba(122,158,138,0.1)','--danger':'#b88a7a','--danger-soft':'rgba(184,138,122,0.08)','--warning':'#b8a070','--heat-cold':'#8ea8b8','--heat-warm':'#b8a070','--heat-hot':'#b88a7a'},
    dark: {'--bg':'#151d21','--surface':'#1f282d','--fg':'#e0e6ea','--muted':'#8c9ba2','--border':'#2f383e','--accent':'#8cb0c0','--accent-hover':'#a2c4d2','--accent-soft':'rgba(140,176,192,0.12)','--success':'#8db89a','--success-soft':'rgba(141,184,154,0.12)','--danger':'#d0a090','--danger-soft':'rgba(208,160,144,0.1)','--warning':'#d0b888','--heat-cold':'#9eb8c8','--heat-warm':'#d0b888','--heat-hot':'#d0a090'}
  }
};

function applyPalette(name) {
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

function initPalette() {
  const saved = localStorage.getItem('flaggo-palette');
  const name = PALETTES[saved] ? saved : 'sage';
  applyPalette(name);
}

function initSettingsModal() {
  const open = () => {
    elements.modalOverlay.classList.add('open');
    document.body.classList.add('modal-open');
    elements.modalOverlay.querySelector('.palette-card[aria-pressed="true"]')?.focus();
  };
  const close = () => {
    elements.modalOverlay.classList.remove('open');
    document.body.classList.remove('modal-open');
    elements.settingsButton?.focus();
  };

  elements.settingsButton?.addEventListener('click', open);
  elements.modalClose?.addEventListener('click', close);
  elements.modalOverlay?.addEventListener('click', (event) => {
    if (event.target === elements.modalOverlay) close();
  });
  elements.modalOverlay?.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }
    if (event.key === 'Tab') {
      const focusable = Array.from(
        elements.modalOverlay.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => el.offsetParent !== null);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });

  elements.modalOverlay?.querySelectorAll('.palette-card').forEach((card) => {
    const select = () => applyPalette(card.dataset.palette);
    card.addEventListener('click', select);
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        select();
      }
    });
  });
}

function normalize(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim();
}

function getFlagUrl(code) {
  return `./flags/${code}.png`;
}

function pickRandomCountry() {
  const index = Math.floor(Math.random() * countries.length);
  return countries[index];
}

function shuffle(values) {
  const copy = [...values];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }

  return copy;
}

function toUtcDateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function getSavedSelection() {
  try {
    const raw = window.localStorage.getItem(MODE_STORAGE_KEY);

    if (!raw) {
      return { gameType: "flag", playMode: "daily", atlasSet: "world" };
    }

    const parsed = JSON.parse(raw);
    const gameType = ["flag", "globe", "atlas"].includes(parsed?.gameType) ? parsed.gameType : "flag";
    const playMode = parsed?.playMode === "unlimited" ? "unlimited" : "daily";
    const atlasSet = ATLAS_SET_IDS.has(parsed?.atlasSet) ? parsed.atlasSet : "world";

    return { gameType, playMode, atlasSet };
  } catch {
    return { gameType: "flag", playMode: "daily", atlasSet: "world" };
  }
}

function saveSelection() {
  try {
    window.localStorage.setItem(
      MODE_STORAGE_KEY,
      JSON.stringify({
        gameType: state.gameType,
        playMode: state.playMode,
        atlasSet: state.atlasSet
      })
    );
  } catch {
    // Ignore storage failures and continue with in-memory state.
  }
}

function getSavedTheme() {
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

function applyTheme(theme) {
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

function toggleTheme() {
  applyTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
}

async function loadDailyScheduleFor(track, path) {
  const response = await fetch(path);

  if (!response.ok) {
    throw new Error(`Failed to load ${track} daily schedule: ${response.status}`);
  }

  const payload = await response.json();
  state.dailySchedules[track] = {
    meta: payload,
    entries: payload.entries || [],
    lookup: new Map((payload.entries || []).map((entry) => [entry.date, entry.code]))
  };
}

async function loadCentroids() {
  const response = await fetch("./data/country-centroids.json");

  if (!response.ok) {
    throw new Error(`Failed to load country centroids: ${response.status}`);
  }

  const payload = await response.json();
  state.centroids = new Map((payload.entries || []).map((entry) => [entry.code, entry]));
}

function loadAtlasCountries() {
  state.atlasCountries = countries.map((country) => {
    const region = COUNTRY_REGION_BY_CODE.get(country.code);

    if (!region) {
      throw new Error(`Atlas region is missing for ${country.name}.`);
    }

    return {
      ...country,
      id: country.code,
      kind: "countries",
      region
    };
  });
}

async function loadWorldMap() {
  const response = await fetch("./data/world-countries-lite.geojson");

  if (!response.ok) {
    throw new Error(`Failed to load world map: ${response.status}`);
  }

  const payload = await response.json();
  const mapFeatures = (payload.features || [])
    .filter((feature) => feature?.properties?.["ISO3166-1-Alpha-2"] && feature?.geometry)
    .map(normalizeMapFeatureWinding);

  state.atlasFeatures = mapFeatures
    .map((feature) => {
      const simplified = simplifyFeature(feature, 0.1);
      return simplified.geometry.coordinates.length ? simplified : feature;
    })
    .map(normalizeMapFeatureWinding)
    .filter((feature) => feature.geometry.coordinates.length);
  state.globeFeatures = mapFeatures
    .map((feature) => simplifyFeature(feature, 0.2))
    .map(normalizeMapFeatureWinding)
    .filter((feature) => feature.geometry.coordinates.length);
}

async function loadMarineAreas() {
  const response = await fetch("./data/marine-areas.geojson");

  if (!response.ok) {
    throw new Error(`Failed to load marine areas: ${response.status}`);
  }

  const payload = await response.json();
  const featureByName = new Map();

  (payload.features || []).forEach((feature) => {
    const name = feature?.properties?.name_en || feature?.properties?.name;
    if (!name || !feature?.geometry) {
      return;
    }

    const key = normalize(name);
    const matches = featureByName.get(key) || [];
    matches.push(feature);
    featureByName.set(key, matches);
  });

  state.marineFeatureByName = featureByName;
}

function normalizeMapFeatureWinding(feature) {
  if (typeof d3 === "undefined") {
    return feature;
  }

  const reverseRing = (ring) => [...ring].reverse();
  const normalizePolygon = (polygon) => {
    const polygonArea = d3.geoArea({ type: "Polygon", coordinates: polygon });
    return polygonArea > Math.PI * 2 ? polygon.map(reverseRing) : polygon;
  };
  const coordinates = feature.geometry.type === "Polygon"
    ? normalizePolygon(feature.geometry.coordinates)
    : feature.geometry.type === "MultiPolygon"
      ? feature.geometry.coordinates.map(normalizePolygon)
      : feature.geometry.coordinates;

  return {
    ...feature,
    geometry: {
      ...feature.geometry,
      coordinates
    }
  };
}

function simplifyFeature(feature, tolerance) {
  if (!feature?.geometry) {
    return feature;
  }

  return {
    ...feature,
    geometry: simplifyGeometry(feature.geometry, tolerance)
  };
}

function simplifyGeometry(geometry, tolerance) {
  if (geometry.type === "Polygon") {
    const polygon = simplifyPolygon(geometry.coordinates, tolerance);
    return { ...geometry, coordinates: polygon || [] };
  }

  if (geometry.type === "MultiPolygon") {
    const polygons = geometry.coordinates
      .map((polygon) => simplifyPolygon(polygon, tolerance))
      .filter(Boolean);
    return { ...geometry, coordinates: polygons };
  }

  return geometry;
}

function simplifyPolygon(polygon, tolerance) {
  const outer = simplifyRing(polygon[0], tolerance);

  if (!outer) {
    return null;
  }

  const holes = polygon.slice(1).map((ring) => simplifyRing(ring, tolerance)).filter(Boolean);

  return [outer, ...holes];
}

function simplifyRing(ring, tolerance) {
  if (!Array.isArray(ring) || ring.length <= 8) {
    return ring;
  }

  const simplified = simplifyLine(ring, tolerance);

  return simplified.length >= 4 ? simplified : null;
}

function simplifyLine(points, tolerance) {
  if (points.length <= 2) {
    return points.slice();
  }

  const first = points[0];
  const last = points[points.length - 1];
  let maxDistance = 0;
  let maxIndex = 0;

  for (let index = 1; index < points.length - 1; index += 1) {
    const distance = perpendicularDistance(points[index], first, last);

    if (distance > maxDistance) {
      maxDistance = distance;
      maxIndex = index;
    }
  }

  if (maxDistance <= tolerance) {
    return [first, last];
  }

  const left = simplifyLine(points.slice(0, maxIndex + 1), tolerance);
  const right = simplifyLine(points.slice(maxIndex), tolerance);

  return left.slice(0, -1).concat(right);
}

function perpendicularDistance(point, lineStart, lineEnd) {
  const [x, y] = point;
  const [x1, y1] = lineStart;
  const [x2, y2] = lineEnd;
  const dx = x2 - x1;
  const dy = y2 - y1;

  if (dx === 0 && dy === 0) {
    return Math.hypot(x - x1, y - y1);
  }

  return Math.abs(dy * x - dx * y + x2 * y1 - y2 * x1) / Math.hypot(dx, dy);
}

function getScheduleForTrack(track) {
  return state.dailySchedules[track];
}

function getDailyCountryForDate(track, dateKey) {
  const schedule = getScheduleForTrack(track);

  if (!schedule?.entries?.length) {
    return null;
  }

  let code = schedule.lookup.get(dateKey);

  if (!code && schedule.meta?.startDate) {
    const startDate = new Date(`${schedule.meta.startDate}T00:00:00Z`);
    const currentDate = new Date(`${dateKey}T00:00:00Z`);
    const differenceInDays = Math.floor((currentDate - startDate) / 86400000);
    const wrappedIndex = ((differenceInDays % schedule.entries.length) + schedule.entries.length) % schedule.entries.length;
    code = schedule.entries[wrappedIndex]?.code;
  }

  return code ? countryByCode.get(code) || null : null;
}

function findCountry(query) {
  const normalizedQuery = normalize(query);

  return countries.find((country) => {
    if (normalize(country.name) === normalizedQuery) {
      return true;
    }

    return country.aliases.some((alias) => normalize(alias) === normalizedQuery);
  });
}

function getInputCandidates() {
  return state.gameType === "atlas" ? getAtlasPlacesForSet() : countries;
}

function getEditDistance(left, right) {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];

    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const substitutionCost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + substitutionCost
      );
    }

    previous.splice(0, previous.length, ...current);
  }

  return previous[right.length];
}

function getSpellingCorrection(query) {
  const normalizedQuery = normalize(query).replace(/[\s-]/g, "");

  if (normalizedQuery.length < 4 || state.finished) {
    return null;
  }

  const candidates = getInputCandidates();
  const exactMatch = candidates.some((place) =>
    [place.name, ...(place.aliases || [])]
      .map((answer) => normalize(answer).replace(/[\s-]/g, ""))
      .includes(normalizedQuery)
  );

  if (exactMatch) {
    return null;
  }

  const maximumDistance = Math.min(3, Math.max(1, Math.ceil(normalizedQuery.length * 0.2)));
  const ranked = candidates
    .map((place) => {
      const distance = Math.min(
        ...[place.name, ...(place.aliases || [])].map((answer) =>
          getEditDistance(normalizedQuery, normalize(answer).replace(/[\s-]/g, ""))
        )
      );
      return { place, distance };
    })
    .filter((entry) => entry.distance <= maximumDistance)
    .sort((a, b) => a.distance - b.distance || a.place.name.localeCompare(b.place.name));

  if (!ranked.length || (ranked[1] && ranked[1].distance === ranked[0].distance)) {
    return null;
  }

  return ranked[0].place;
}

function getAtlasSetDefinition() {
  return ATLAS_SETS.find((set) => set.id === state.atlasSet) || ATLAS_SETS[0];
}

function getAtlasPlacesForSet() {
  const set = getAtlasSetDefinition();

  if (set.kind === "countries") {
    return set.region
      ? state.atlasCountries.filter((place) => place.region === set.region)
      : state.atlasCountries;
  }

  return ATLAS_PHYSICAL_PLACES
    .filter((place) => place.kind === set.kind)
    .map((place) => ({ ...place, coordinates: ATLAS_PHYSICAL_COORDINATES.get(place.id) || null }));
}

function isAtlasCountrySet() {
  return getAtlasSetDefinition().kind === "countries";
}

function isAtlasAnswer(place, query) {
  const normalizedQuery = normalize(query);
  return [place.name, ...(place.aliases || [])].some((answer) => normalize(answer) === normalizedQuery);
}

function renderSpellingCorrection() {
  elements.spellingSuggestion.innerHTML = "";

  if (!state.suggestedCorrection || state.finished) {
    elements.spellingSuggestion.classList.remove("visible");
    elements.countryInput.setAttribute("aria-expanded", "false");
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
  elements.countryInput.setAttribute("aria-expanded", "true");
}

function getHeatClass(distanceKm) {
  if (distanceKm <= HEAT_BANDS_KM.hot) {
    return "hot";
  }

  if (distanceKm <= HEAT_BANDS_KM.warm) {
    return "warm";
  }

  return "cold";
}

function getHeatLabel(heatClass) {
  if (heatClass === "hot") {
    return "hot";
  }

  if (heatClass === "warm") {
    return "warm";
  }

  return "cold";
}

function formatDistance(distanceKm) {
  return `${Math.round(distanceKm).toLocaleString()} km away`;
}

function renderGuesses() {
  elements.guessList.innerHTML = "";
  const isGlobe = state.gameType === "globe";
  const isAtlas = state.gameType === "atlas";
  elements.guessList.classList.toggle("globle-board", isGlobe);
  elements.guessList.classList.toggle("atlas-board", isAtlas);

  if (isAtlas) {
    const namedCount = state.guesses.filter((guess) => guess.correct).length;
    const total = state.atlasQueue.length;
    const completedCount = state.guesses.length;
    elements.historyCount.textContent = isAtlasCountrySet()
      ? `${namedCount} named · ${total - completedCount} left`
      : `${namedCount} / ${total} named`;

    if (!state.guesses.length) {
      const emptyItem = document.createElement("li");
      emptyItem.className = "guess-item empty";
      emptyItem.innerHTML = `
        <span class="guess-label">Set ready</span>
        <span class="guess-result">${isAtlasCountrySet()
          ? "Click a country or type its name. Use the map until every country is complete."
          : "Name the highlighted area or reveal the answer if you're stuck."}</span>
      `;
      elements.guessList.appendChild(emptyItem);
      return;
    }

    state.guesses.slice(-6).reverse().forEach((guess) => {
      const item = document.createElement("li");
      item.className = `guess-item ${guess.correct ? "correct" : "incorrect"}`;
      item.innerHTML = `
        <span class="guess-label">${guess.number}. ${guess.name}</span>
        <span class="guess-result">${guess.correct ? "Named" : "Revealed"}</span>
      `;
      elements.guessList.appendChild(item);
    });
    return;
  }

  if (isGlobe) {
    elements.historyCount.textContent = state.finished ? "Round complete" : `${state.guesses.length} guesses`;

    if (!state.guesses.length) {
      const emptyItem = document.createElement("li");
      emptyItem.className = "guess-item empty";
      emptyItem.innerHTML = `
        <span class="guess-label">No guesses yet</span>
        <span class="guess-result">Guess any country. The globe will heat up as you get closer.</span>
      `;
      elements.guessList.appendChild(emptyItem);
      return;
    }

    const rankedGuesses = [...state.guesses].sort((a, b) => {
      if (a.correct !== b.correct) {
        return a.correct ? -1 : 1;
      }

      return (a.distanceKm ?? 0) - (b.distanceKm ?? 0);
    });

    rankedGuesses.forEach((guess, index) => {
      const item = document.createElement("li");
      item.className = `guess-item ${guess.correct ? "correct" : guess.heatClass}`;
      item.innerHTML = `
        <span class="guess-label">${index + 1}. ${guess.name}</span>
        <span class="guess-result">${guess.correct ? "Correct country" : `${formatDistance(guess.distanceKm)} · ${getHeatLabel(guess.heatClass)}`}</span>
      `;
      elements.guessList.appendChild(item);
    });

    return;
  }

  elements.historyCount.textContent = state.finished ? "Round complete" : `${MAX_GUESSES - state.guesses.length} slots left`;

  for (let index = 0; index < MAX_GUESSES; index += 1) {
    const item = document.createElement("li");
    const guess = state.guesses[index];

    if (guess) {
      item.className = `guess-item ${guess.correct ? "correct" : "incorrect"}`;
      item.innerHTML = `
        <span class="guess-label">${index + 1}. ${guess.name}</span>
        <span class="guess-result">${guess.correct ? "Correct" : "Tile opened"}</span>
      `;
    } else {
      item.className = `guess-item ${state.finished ? "locked" : "empty"}`;
      item.innerHTML = `
        <span class="guess-label">${index + 1}. ${state.finished ? "Round complete" : "Waiting..."}</span>
        <span class="guess-result">${state.finished ? "Start a new round to play again." : "Your next valid guess goes here."}</span>
      `;
    }

    elements.guessList.appendChild(item);
  }
}

function updateStatus(message, tone = "default") {
  elements.statusMessage.textContent = message;
  elements.statusMessage.classList.toggle("success", tone === "success");
  elements.statusMessage.classList.toggle("failure", tone === "failure");
  elements.statusMessage.style.color =
    tone === "failure" ? "var(--danger)" : tone === "success" ? "var(--success)" : "var(--muted)";
}

function clearSpellingCorrection() {
  state.suggestedCorrection = null;
  renderSpellingCorrection();
}

function setRoundInteractivity(enabled) {
  elements.countryInput.disabled = !enabled;
  elements.guessButton.disabled = !enabled;
  elements.giveUpButton.disabled = !enabled;
}

function acceptSpellingCorrection(place) {
  elements.countryInput.value = place.name;
  clearSpellingCorrection();
  elements.countryInput.focus();
}

function offerSpellingCorrection(query, fallbackMessage) {
  state.suggestedCorrection = getSpellingCorrection(query);
  renderSpellingCorrection();
  updateStatus(
    state.suggestedCorrection
      ? "That name wasn’t recognized. Check the spelling suggestion below."
      : fallbackMessage,
    "failure"
  );
}

function updateFlagFrameAspectRatio() {
  const { naturalWidth, naturalHeight } = elements.flagImage;

  if (!naturalWidth || !naturalHeight) {
    return;
  }

  elements.flagFrame.style.setProperty("--flag-aspect-ratio", `${naturalWidth} / ${naturalHeight}`);
  elements.flagFrame.style.setProperty("--flag-aspect-number", String(naturalWidth / naturalHeight));
}

function renderMask() {
  elements.flagMask.innerHTML = "";
  const openedTiles = new Set(state.revealOrder.slice(0, state.revealedTiles));

  for (let index = 0; index < TOTAL_TILES; index += 1) {
    const tile = document.createElement("span");
    tile.className = "mask-tile";

    if (openedTiles.has(index)) {
      tile.classList.add("revealed");
    }

    elements.flagMask.appendChild(tile);
  }
}

function revealNextTile() {
  if (state.revealedTiles >= TOTAL_TILES) {
    return;
  }

  state.revealedTiles += 1;
  renderMask();
}

function revealAllTiles() {
  state.revealedTiles = TOTAL_TILES;
  renderMask();
}

function getFeatureCode(feature) {
  const rawCode = feature?.properties?.["ISO3166-1-Alpha-2"]?.toLowerCase();
  if (rawCode && rawCode !== "-99") {
    return rawCode;
  }

  return MAP_FEATURE_CODE_OVERRIDES.get(feature?.properties?.name) || null;
}

function getGuessColor(guess) {
  if (!guess) {
    return "#f1eadf";
  }

  if (guess.correct) {
    return "#1f8f5f";
  }

  return getHeatFillColor(guess.distanceKm);
}

function getHeatFillColor(distanceKm) {
  const clampedDistance = clamp(distanceKm, 0, 12000);
  const closeness = 1 - clampedDistance / 12000;
  const red = Math.round(246 - closeness * 128);
  const green = Math.round(194 - closeness * 176);
  const blue = Math.round(194 - closeness * 176);

  return `rgb(${red}, ${green}, ${blue})`;
}

function ensureGlobeRenderer(width, height) {
  const context = elements.globeCanvas.getContext("2d");

  if (!state.globeProjection || !state.globePath) {
    state.globeProjection = d3.geoOrthographic().clipAngle(90).precision(0.25);
    state.globePath = d3.geoPath(state.globeProjection, context);
  }

  state.globeProjection
    .translate([width / 2, height / 2])
    .scale(Math.min(width, height) * 0.485 * state.globeZoom)
    .rotate(state.globeRotation);
}

function adjustGlobeZoom(delta) {
  if (state.gameType !== "globe") {
    return;
  }

  state.globeZoom = clamp(state.globeZoom + delta, GLOBE_ZOOM_MIN, GLOBE_ZOOM_MAX);
  queueGlobeRender();
}

function handleGlobeWheelZoom(event) {
  if (state.gameType !== "globe") {
    return;
  }

  event.preventDefault();
  const step = clamp(-event.deltaY * 0.0015, -0.35, 0.35);
  adjustGlobeZoom(step);
}

function renderGlobe() {
  if (state.gameType !== "globe" || !elements.globeCanvas || !state.globeFeatures.length || typeof d3 === "undefined") {
    return;
  }

  const canvas = elements.globeCanvas;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;

  if (!width || !height) {
    return;
  }

  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);

  const context = canvas.getContext("2d");
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.clearRect(0, 0, width, height);

  ensureGlobeRenderer(width, height);
  const path = state.globePath;
  const guessedByCode = new Map(state.guesses.map((guess) => [guess.code, guess]));

  context.beginPath();
  path({ type: "Sphere" });
  context.fillStyle = "#cfe0f6";
  context.fill();

  context.beginPath();
  path(d3.geoGraticule10());
  context.strokeStyle = "rgba(255, 255, 255, 0.22)";
  context.lineWidth = 0.55;
  context.stroke();

  state.globeFeatures.forEach((feature) => {
    const code = getFeatureCode(feature);
    const guess = code ? guessedByCode.get(code) : null;
    const isRevealedTarget = state.finished && code === state.target?.code;

    context.beginPath();
    path(feature);
    context.fillStyle = isRevealedTarget ? "#1f8f5f" : getGuessColor(guess);
    context.fill();
    context.strokeStyle = "rgba(20, 33, 61, 0.22)";
    context.lineWidth = 0.45;
    context.stroke();
  });

  context.beginPath();
  path({ type: "Sphere" });
  context.strokeStyle = "rgba(20, 33, 61, 0.28)";
  context.lineWidth = 1.2;
  context.stroke();
}

function queueGlobeRender() {
  if (state.gameType !== "globe") {
    return;
  }

  if (state.globeRenderQueued) {
    return;
  }

  state.globeRenderQueued = true;
  window.requestAnimationFrame(() => {
    state.globeRenderQueued = false;
    renderGlobe();
  });
}

function getAtlasCountryPlaceByCode(code) {
  return state.atlasQueue.find((place) => place.code === code) || null;
}

function getAtlasMapHeading() {
  const labels = {
    world: "World map",
    africa: "Africa map",
    asia: "Asia map",
    europe: "Europe map",
    "north-america": "North America map",
    "south-america": "South America map",
    oceania: "Oceania map"
  };

  return labels[state.atlasSet] || "Country map";
}

function getAtlasPhysicalTargetCodes(place) {
  if (!place || place.kind !== "continents") {
    return new Set();
  }

  if (place.id === "antarctica") {
    return new Set(["aq"]);
  }

  const region = place.id.replaceAll("_", "-");
  return new Set(
    state.atlasCountries
      .filter((country) => country.region === region)
      .map((country) => country.code)
  );
}

function updateAtlasCountryMapStyles() {
  if (!elements.atlasMap || typeof d3 === "undefined") {
    return;
  }

  const completedById = new Map(state.guesses.map((guess) => [guess.id, guess]));
  d3.select(elements.atlasMap)
    .selectAll(".atlas-country")
    .classed("selected", (feature) => {
      const code = getFeatureCode(feature);
      return Boolean(code && code === state.atlasSelectedCode);
    })
    .classed("named", (feature) => completedById.get(getFeatureCode(feature))?.correct === true)
    .classed("revealed", (feature) => completedById.get(getFeatureCode(feature))?.correct === false);

  const namedCount = state.guesses.filter((guess) => guess.correct).length;
  const completedCount = state.guesses.length;
  elements.atlasPosition.textContent = `${completedCount} / ${state.atlasQueue.length} complete`;
  elements.atlasMapSelection.textContent = state.atlasSelectedCode
    ? "Country selected · type its name"
    : namedCount
      ? `${namedCount} named · click or type another`
      : "Click a country, then name it";
  elements.giveUpButton.disabled = state.finished || !state.atlasSelectedCode;
}

function selectAtlasCountry(place) {
  if (!place || state.finished) {
    return;
  }

  const completed = state.guesses.find((guess) => guess.id === place.id);
  if (completed) {
    updateStatus(`${place.name} is already ${completed.correct ? "named" : "revealed"}. Choose another country.`);
    return;
  }

  state.target = place;
  state.atlasSelectedCode = place.code;
  state.atlasAnswered = false;
  elements.countryInput.value = "";
  clearSpellingCorrection();
  updateAtlasCountryMapStyles();
  updateStatus("Country selected. Type its full name.");
  elements.countryInput.focus();
}

function createAtlasProjection(featureCollection) {
  if (!isAtlasCountrySet() || state.atlasSet === "world") {
    return d3.geoNaturalEarth1().fitExtent([[28, 28], [972, 592]], featureCollection);
  }

  const regionalViews = {
    africa: { center: [20, 2], scale: 390 },
    asia: { center: [88, 36], scale: 285 },
    europe: { center: [16, 53], scale: 590 },
    "north-america": { center: [-105, 43], scale: 285 },
    "south-america": { center: [-61, -18], scale: 370 },
    oceania: { center: [150, -20], scale: 345 }
  };
  const view = regionalViews[state.atlasSet] || regionalViews.europe;

  return d3.geoMercator()
    .center(view.center)
    .scale(view.scale)
    .translate([500, 310]);
}

function activateAtlasFeature(event, feature) {
  const place = getAtlasCountryPlaceByCode(getFeatureCode(feature));
  if (!place) {
    return;
  }

  event.stopPropagation();
  selectAtlasCountry(place);
}

function renderAtlasCountryMap() {
  if (!elements.atlasMap || !state.atlasFeatures.length || typeof d3 === "undefined") {
    return;
  }

  const isCountryMap = isAtlasCountrySet();
  const activeCodes = isCountryMap
    ? new Set(state.atlasQueue.map((place) => place.code))
    : getAtlasPhysicalTargetCodes(state.target);
  const selectedFeatures = isCountryMap
    ? state.atlasFeatures.filter((feature) => activeCodes.has(getFeatureCode(feature)))
    : state.atlasFeatures;
  const featureCollection = { type: "FeatureCollection", features: selectedFeatures };
  const projection = createAtlasProjection(featureCollection);
  const path = d3.geoPath(projection);
  const svg = d3.select(elements.atlasMap);

  if (state.atlasZoomFrame !== null) {
    window.cancelAnimationFrame(state.atlasZoomFrame);
    state.atlasZoomFrame = null;
  }
  state.atlasPendingTransform = null;
  elements.atlasMap.classList.remove("is-interacting");
  svg.selectAll("*").remove();

  svg.append("rect")
    .attr("class", "atlas-map-water")
    .attr("width", 1000)
    .attr("height", 620);

  const mapLayer = svg.append("g").attr("class", "atlas-map-layer");
  state.atlasMapLayer = mapLayer;

  if (!isCountryMap && state.target?.kind === "waters") {
    const marineFeatures = state.marineFeatureByName.get(normalize(state.target.name)) || [];
    if (marineFeatures.length) {
      mapLayer
        .append("g")
        .attr("class", "atlas-water-highlight-layer")
        .selectAll("path")
        .data(marineFeatures)
        .join("path")
        .attr("class", "atlas-water-highlight")
        .attr("d", path);
    } else if (state.target.coordinates) {
      const [x, y] = projection(state.target.coordinates);
      const [rx, ry, angle] = ATLAS_WATER_FALLBACK_AREAS.get(state.target.id) || [24, 16, 0];
      mapLayer
        .append("ellipse")
        .attr("class", "atlas-water-highlight atlas-water-highlight-fallback")
        .attr("cx", x)
        .attr("cy", y)
        .attr("rx", rx)
        .attr("ry", ry)
        .attr("transform", `rotate(${angle} ${x} ${y})`);
    }
  }

  const orderedFeatures = [...state.atlasFeatures].sort((a, b) =>
    Number(activeCodes.has(getFeatureCode(a))) - Number(activeCodes.has(getFeatureCode(b)))
  );
  const countryLayer = mapLayer.append("g").attr("class", "atlas-country-layer");

  countryLayer
    .selectAll("path")
    .data(orderedFeatures)
    .join("path")
    .attr("d", path)
    .attr("data-country-code", (feature) => getFeatureCode(feature) || "")
    .attr("class", (feature) => {
      const isActive = activeCodes.has(getFeatureCode(feature));
      if (isCountryMap) {
        return isActive ? "atlas-country" : "atlas-country outside-set";
      }
      return isActive ? "atlas-country atlas-physical-target" : "atlas-country atlas-physical-base";
    })
    .on("click", isCountryMap ? activateAtlasFeature : null);

  const markerFeatures = isCountryMap
    ? selectedFeatures.filter((feature) => path.area(feature) < 6)
    : [];
  const mapMarkers = countryLayer
    .selectAll("circle")
    .data(markerFeatures)
    .join("circle")
    .attr("class", "atlas-country-hit-marker")
    .attr("data-country-code", (feature) => getFeatureCode(feature) || "")
    .attr("cx", (feature) => path.centroid(feature)[0])
    .attr("cy", (feature) => path.centroid(feature)[1])
    .attr("r", 4.5)
    .on("click", activateAtlasFeature);

  const zoomBehavior = d3.zoom()
    .scaleExtent([1, 10])
    .extent([[0, 0], [1000, 620]])
    .translateExtent([[-120, -90], [1120, 710]])
    .on("start", () => {
      elements.atlasMap.classList.add("is-interacting");
    })
    .on("zoom", (event) => {
      state.atlasPendingTransform = event.transform;

      if (state.atlasZoomFrame !== null) {
        return;
      }

      state.atlasZoomFrame = window.requestAnimationFrame(() => {
        const transform = state.atlasPendingTransform;
        state.atlasZoomFrame = null;

        if (!transform || state.atlasMapLayer !== mapLayer) {
          return;
        }

        mapLayer.attr("transform", transform);
        mapMarkers.attr("r", 4.5 / transform.k);
      });
    })
    .on("end", () => {
      elements.atlasMap.classList.remove("is-interacting");
    });

  state.atlasZoomBehavior = zoomBehavior;
  svg.call(zoomBehavior);
  svg.call(zoomBehavior.transform, d3.zoomIdentity);
  if (isCountryMap) {
    updateAtlasCountryMapStyles();
  } else {
    elements.atlasPosition.textContent = `${state.atlasIndex + 1} / ${state.atlasQueue.length}`;
    elements.atlasMapSelection.textContent = "Name the highlighted area";
    elements.giveUpButton.disabled = state.finished || state.atlasAnswered;
  }
}

function adjustAtlasZoom(factor) {
  if (!isAtlasCountrySet() || !state.atlasZoomBehavior) {
    return;
  }

  d3.select(elements.atlasMap)
    .transition()
    .duration(180)
    .call(state.atlasZoomBehavior.scaleBy, factor);
}

function resetAtlasZoom() {
  if (!state.atlasZoomBehavior) {
    return;
  }

  d3.select(elements.atlasMap)
    .transition()
    .duration(220)
    .call(state.atlasZoomBehavior.transform, d3.zoomIdentity);
}

function rotateGlobeToCountry(code, animate = true) {
  const centroid = state.centroids.get(code);

  if (!centroid) {
    return;
  }

  const targetRotation = [-centroid.lng, -centroid.lat, 0];

  if (!animate) {
    state.globeRotation = targetRotation;
    queueGlobeRender();
    return;
  }

  if (state.globeAnimationFrame) {
    cancelAnimationFrame(state.globeAnimationFrame);
  }

  const startRotation = [...state.globeRotation];
  const startTime = performance.now();
  const duration = 380;

  const animateFrame = (now) => {
    const progress = clamp((now - startTime) / duration, 0, 1);
    const eased = 1 - Math.pow(1 - progress, 3);

    state.globeRotation = [
      startRotation[0] + (targetRotation[0] - startRotation[0]) * eased,
      startRotation[1] + (targetRotation[1] - startRotation[1]) * eased,
      0
    ];

    queueGlobeRender();

    if (progress < 1) {
      state.globeAnimationFrame = requestAnimationFrame(animateFrame);
      return;
    }

    state.globeAnimationFrame = null;
  };

  state.globeAnimationFrame = requestAnimationFrame(animateFrame);
}

function updateModeUI() {
  const isFlag = state.gameType === "flag";
  const isGlobe = state.gameType === "globe";
  const isAtlas = state.gameType === "atlas";
  const isDaily = state.playMode === "daily";
  const isUnlimited = state.playMode === "unlimited";
  const atlasSet = getAtlasSetDefinition();
  const isAtlasCountryMap = isAtlas && atlasSet.kind === "countries";

  elements.flagGameButton.classList.toggle("active", isFlag);
  elements.globleGameButton.classList.toggle("active", isGlobe);
  elements.atlasGameButton.classList.toggle("active", isAtlas);
  elements.dailyModeButton.classList.toggle("active", isDaily);
  elements.unlimitedModeButton.classList.toggle("active", isUnlimited);
  elements.playModeSwitch.classList.toggle("is-hidden", isAtlas);
  elements.atlasSetControl.classList.toggle("is-hidden", !isAtlas);
  elements.atlasSetSelect.value = state.atlasSet;

  elements.pageTitle.textContent = isAtlas
    ? isAtlasCountryMap ? "Name every country on the map." : "Name the highlighted area."
    : isGlobe
      ? "Guess the country from the globe."
      : "Guess the country from its flag.";
  elements.roundTitle.textContent = isAtlas
    ? atlasSet.label
    : isGlobe
      ? isDaily ? "Daily globe mystery country" : "Unlimited globe practice"
      : isDaily ? "Daily shared flag" : "Unlimited flag practice";
  elements.guessesTitle.textContent = isAtlas ? "Set progress" : isGlobe ? "Proximity board" : "Guess board";
  elements.newGameButton.textContent = isAtlas
    ? isAtlasCountryMap ? "Restart map" : state.finished ? "Restart set" : "Next map"
    : isGlobe ? "New globe" : "New flag";
  elements.newGameButton.classList.toggle(
    "is-hidden",
    isAtlas ? isAtlasCountryMap ? !state.finished : !state.atlasAnswered && !state.finished : isDaily
  );
  elements.giveUpButton.textContent = isAtlas ? isAtlasCountryMap ? "Reveal selected" : "Reveal answer" : "Give up";
  elements.guessButton.textContent = isAtlas ? isAtlasCountryMap ? "Name country" : "Check" : "Guess";
  elements.countryInputLabel.textContent = isAtlas ? "Geographic area name" : "Country name";
  elements.countryInput.placeholder = isAtlas
    ? isAtlasCountryMap ? "Type the full country name..." : "Name the highlighted area..."
    : "Type the full country name...";
  elements.inputHint.innerHTML = isAtlas
    ? isAtlasCountryMap
      ? "Click a country or enter its full name. Spelling help appears only after an unrecognized answer."
      : "Enter the highlighted area's full name. Spelling help appears only after an unrecognized answer."
    : "Enter a full country name and press <kbd>Enter</kbd>. Spelling help appears only after an unrecognized answer.";
  elements.gameCenter.classList.toggle("globle-layout", isGlobe);
  elements.gameCenter.classList.toggle("atlas-layout", isAtlas);
  elements.flagStage.classList.toggle("is-hidden", !isFlag);
  elements.globleStage.classList.toggle("is-hidden", !isGlobe);
  elements.atlasStage.classList.toggle("is-hidden", !isAtlas);

  elements.flagImage.classList.toggle("is-hidden", !isFlag);
  elements.flagMask.classList.toggle("is-hidden", !isFlag);
  elements.globlePanel.classList.toggle("is-hidden", !isGlobe);
  elements.globlePanel.setAttribute("aria-hidden", String(!isGlobe));
  elements.atlasStage.setAttribute("aria-hidden", String(!isAtlas));
}

function finishRound(message, tone) {
  state.finished = true;
  elements.countryInput.value = "";
  clearSpellingCorrection();

  if (state.gameType !== "globe") {
    revealAllTiles();
  }

  setRoundInteractivity(false);
  updateStatus(message, tone);
  renderGuesses();
  queueGlobeRender();
}

function calculateDistanceKm(from, to) {
  const earthRadiusKm = 6371;
  const deltaLat = toRadians(to.lat - from.lat);
  const deltaLng = toRadians(to.lng - from.lng);
  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function clearAtlasAdvanceTimer() {
  if (state.atlasAdvanceTimer) {
    window.clearTimeout(state.atlasAdvanceTimer);
    state.atlasAdvanceTimer = null;
  }
}

function showAtlasCountryBoard() {
  state.target = null;
  state.atlasSelectedCode = null;
  state.atlasAnswered = false;
  state.finished = false;
  elements.atlasMapShell.classList.remove("is-hidden");
  elements.atlasHeading.textContent = getAtlasMapHeading();
  elements.countryInput.value = "";
  clearSpellingCorrection();
  setRoundInteractivity(true);
  updateModeUI();
  updateStatus(`Name all ${state.atlasQueue.length} countries. Click a country to target it, or type any country in this set.`);
  renderGuesses();
  renderAtlasCountryMap();
  elements.countryInput.focus();
}

function showAtlasTarget() {
  state.target = state.atlasQueue[state.atlasIndex];
  state.atlasAnswered = false;
  state.finished = false;
  state.atlasSelectedCode = null;
  elements.atlasMapShell.classList.remove("is-hidden");
  elements.atlasHeading.textContent = state.target.kind === "waters" ? "Oceans & seas map" : "Continents map";
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

function startAtlasSession() {
  clearAtlasAdvanceTimer();
  const places = getAtlasPlacesForSet();

  if (!places.length) {
    updateStatus("This study set could not be loaded.", "failure");
    setRoundInteractivity(false);
    return;
  }

  state.atlasQueue = getAtlasSetDefinition().kind === "countries" ? places : shuffle(places);
  state.atlasIndex = 0;
  state.guesses = [];
  state.atlasSelectedCode = null;

  if (isAtlasCountrySet()) {
    showAtlasCountryBoard();
    return;
  }

  showAtlasTarget();
}

function completeAtlasSet() {
  clearAtlasAdvanceTimer();
  state.finished = true;
  state.atlasAnswered = true;
  state.atlasSelectedCode = null;
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

function advanceAtlas() {
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

function submitAtlasGuess(rawValue) {
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

function submitAtlasCountryGuess(rawValue) {
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

  if (state.atlasSelectedCode && place.code !== state.atlasSelectedCode) {
    updateStatus(`${place.name} is not the selected country. Try again or select a different area.`, "failure");
    return;
  }

  state.guesses.push({
    name: place.name,
    id: place.id,
    code: place.code,
    number: state.guesses.length + 1,
    correct: true
  });
  state.target = null;
  state.atlasSelectedCode = null;
  elements.countryInput.value = "";
  clearSpellingCorrection();
  renderGuesses();
  updateAtlasCountryMapStyles();

  if (state.guesses.length >= state.atlasQueue.length) {
    completeAtlasSet();
    return;
  }

  updateStatus(`Correct — ${place.name}. Keep going.`, "success");
  elements.countryInput.focus();
}

function revealAtlasAnswer() {
  if (isAtlasCountrySet()) {
    revealAtlasCountry();
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

function revealAtlasCountry() {
  const place = state.atlasSelectedCode ? getAtlasCountryPlaceByCode(state.atlasSelectedCode) : null;
  if (!place) {
    updateStatus("Click a country on the map before revealing it.", "failure");
    return;
  }

  state.guesses.push({
    name: place.name,
    id: place.id,
    code: place.code,
    number: state.guesses.length + 1,
    correct: false
  });
  state.target = null;
  state.atlasSelectedCode = null;
  elements.countryInput.value = "";
  clearSpellingCorrection();
  renderGuesses();
  updateAtlasCountryMapStyles();

  if (state.guesses.length >= state.atlasQueue.length) {
    completeAtlasSet();
    return;
  }

  updateStatus(`That country is ${place.name}. Choose another area when you're ready.`);
  elements.countryInput.focus();
}

function submitFlagGuess(country) {
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
    return;
  }

  if (state.guesses.length >= MAX_GUESSES) {
    finishRound(`Round over. You used all 6 guesses. The flag was ${state.target.name}.`, "failure");
    return;
  }

  updateStatus(`${country.name} is not it. One more tile opened.`, "default");
  elements.countryInput.value = "";
  clearSpellingCorrection();
  renderGuesses();
}

function submitGlobeGuess(country) {
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
  renderGuesses();
  queueGlobeRender();
}

function submitGuess(rawValue) {
  if (state.finished) {
    updateStatus("That round is done. Start another round when you're ready.");
    return;
  }

  if (state.gameType === "atlas") {
    submitAtlasGuess(rawValue);
    return;
  }

  const country = findCountry(rawValue);

  if (!country) {
    offerSpellingCorrection(rawValue, "That country name wasn’t recognized. Check the spelling and try again.");
    return;
  }

  const alreadyGuessed = state.guesses.some((guess) => guess.code === country.code);
  if (alreadyGuessed) {
    updateStatus(`${country.name} is already on the board. Try another country.`, "failure");
    return;
  }

  if (state.gameType === "globe") {
    submitGlobeGuess(country);
    return;
  }

  submitFlagGuess(country);
}

function giveUp() {
  if (state.finished) {
    updateStatus("The round is already over. Start a new round when you're ready.");
    return;
  }

  if (state.gameType === "atlas") {
    revealAtlasAnswer();
    return;
  }

  if (state.gameType === "globe") {
    finishRound(`You gave up. The country was ${state.target.name}.`, "failure");
    return;
  }

  finishRound(`You gave up. The flag was ${state.target.name}.`, "failure");
}

function resizeConfettiCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const { innerWidth, innerHeight } = window;

  elements.confettiCanvas.width = Math.floor(innerWidth * dpr);
  elements.confettiCanvas.height = Math.floor(innerHeight * dpr);
  elements.confettiCanvas.style.width = `${innerWidth}px`;
  elements.confettiCanvas.style.height = `${innerHeight}px`;

  confetti.context = elements.confettiCanvas.getContext("2d");
  confetti.context.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function launchConfetti() {
  resizeConfettiCanvas();
  confetti.pieces = Array.from({ length: 140 }, () => ({
    x: randomBetween(0, window.innerWidth),
    y: randomBetween(-window.innerHeight * 0.3, -20),
    size: randomBetween(6, 12),
    color: ["#d96b2b", "#1f8f5f", "#14213d", "#ffcf33", "#f28482"][Math.floor(Math.random() * 5)],
    velocityX: randomBetween(-2.2, 2.2),
    velocityY: randomBetween(2.8, 6.8),
    rotation: randomBetween(0, Math.PI * 2),
    rotationSpeed: randomBetween(-0.18, 0.18)
  }));

  confetti.endAt = performance.now() + 2600;

  if (confetti.animationFrame) {
    cancelAnimationFrame(confetti.animationFrame);
  }

  renderConfetti();
}

function renderConfetti() {
  const ctx = confetti.context;
  if (!ctx) {
    return;
  }

  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

  confetti.pieces.forEach((piece) => {
    piece.x += piece.velocityX;
    piece.y += piece.velocityY;
    piece.rotation += piece.rotationSpeed;
    piece.velocityY += 0.03;

    ctx.save();
    ctx.translate(piece.x, piece.y);
    ctx.rotate(piece.rotation);
    ctx.fillStyle = piece.color;
    ctx.fillRect(-piece.size / 2, -piece.size / 2, piece.size, piece.size * 0.7);
    ctx.restore();
  });

  confetti.pieces = confetti.pieces.filter((piece) => piece.y < window.innerHeight + 30);

  if (performance.now() < confetti.endAt && confetti.pieces.length) {
    confetti.animationFrame = requestAnimationFrame(renderConfetti);
    return;
  }

  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  confetti.animationFrame = null;
}

function getTargetCountryForSelection() {
  if (state.playMode === "daily") {
    state.dailyDateKey = toUtcDateKey();
    const track = state.gameType === "globe" ? "globe" : "flag";
    return getDailyCountryForDate(track, state.dailyDateKey);
  }

  state.dailyDateKey = null;
  return pickRandomCountry();
}

function startGame() {
  clearAtlasAdvanceTimer();
  if (state.gameType === "atlas") {
    startAtlasSession();
    return;
  }

  const nextTarget = getTargetCountryForSelection();
  state.target = nextTarget || pickRandomCountry();
  state.guesses = [];
  state.suggestedCorrection = null;
  state.finished = false;
  state.revealedTiles = 0;
  state.revealOrder = state.gameType === "flag"
    ? [1, 4, ...shuffle([0, 2, 3, 5])]
    : shuffle(Array.from({ length: TOTAL_TILES }, (_, index) => index));

  if (state.gameType === "globe") {
    state.globeRotation = [-20, -18, 0];
    state.globeZoom = 1;
    if (state.globeAnimationFrame) {
      cancelAnimationFrame(state.globeAnimationFrame);
      state.globeAnimationFrame = null;
    }
  }

  updateModeUI();
  elements.flagImage.src = getFlagUrl(state.target.code);
  elements.flagImage.alt = "Mystery country flag";
  elements.countryInput.value = "";
  setRoundInteractivity(true);

  if (state.gameType === "globe") {
    updateStatus(
      state.playMode === "daily"
        ? "Daily globe mode: a separate UTC-dated country is shared here each day."
        : "Unlimited globe mode: every new round picks another random country.",
      "default"
    );
  } else {
    updateStatus(
      state.playMode === "daily"
        ? "Daily flag mode: a separate UTC-dated flag is shared here each day."
        : "Unlimited flag mode: every new round picks another random flag.",
      "default"
    );
  }

  clearSpellingCorrection();
  renderMask();
  renderGuesses();
  queueGlobeRender();
  elements.countryInput.focus();
}

function setSelection(partial) {
  const nextGameType = partial.gameType ?? state.gameType;
  const nextPlayMode = partial.playMode ?? state.playMode;

  if (nextGameType === state.gameType && nextPlayMode === state.playMode) {
    return;
  }

  if (nextGameType !== "atlas" && nextPlayMode === "daily") {
    const track = nextGameType === "globe" ? "globe" : "flag";
    if (!getScheduleForTrack(track)?.entries?.length) {
      return;
    }
  }

  if (nextGameType === "globe" && (!state.centroids.size || !state.globeFeatures.length)) {
    return;
  }

  state.gameType = nextGameType;
  state.playMode = nextPlayMode;
  clearAtlasAdvanceTimer();
  saveSelection();
  startGame();
}

function beginGlobeDrag(event) {
  if (state.gameType !== "globe") {
    return;
  }

  state.globeDragging = true;
  state.globeDragStart = { x: event.clientX, y: event.clientY };
  state.globeRotationStart = [...state.globeRotation];
  elements.globeCanvas.classList.add("dragging");
  elements.globeCanvas.setPointerCapture(event.pointerId);
}

function moveGlobeDrag(event) {
  if (!state.globeDragging) {
    return;
  }

  const deltaX = event.clientX - state.globeDragStart.x;
  const deltaY = event.clientY - state.globeDragStart.y;
  state.globeRotation = [
    state.globeRotationStart[0] + deltaX * 0.35,
    clamp(state.globeRotationStart[1] - deltaY * 0.35, -70, 70),
    0
  ];

  queueGlobeRender();
}

function endGlobeDrag(event) {
  if (!state.globeDragging) {
    return;
  }

  state.globeDragging = false;
  state.globeDragStart = null;
  state.globeRotationStart = null;
  elements.globeCanvas.classList.remove("dragging");

  if (event?.pointerId != null) {
    elements.globeCanvas.releasePointerCapture(event.pointerId);
  }
}

elements.countryInput.addEventListener("input", () => {
  clearSpellingCorrection();
});

elements.countryInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && state.suggestedCorrection) {
    event.preventDefault();
    const correction = state.suggestedCorrection;
    acceptSpellingCorrection(correction);
    submitGuess(correction.name);
  }

  if (event.key === "Escape") {
    clearSpellingCorrection();
  }
});

elements.guessForm.addEventListener("submit", (event) => {
  event.preventDefault();
  submitGuess(elements.countryInput.value);
});

elements.flagGameButton.addEventListener("click", () => {
  setSelection({ gameType: "flag" });
});

elements.globleGameButton.addEventListener("click", () => {
  setSelection({ gameType: "globe" });
});

elements.atlasGameButton.addEventListener("click", () => {
  setSelection({ gameType: "atlas" });
});

elements.dailyModeButton.addEventListener("click", () => {
  setSelection({ playMode: "daily" });
});

elements.unlimitedModeButton.addEventListener("click", () => {
  setSelection({ playMode: "unlimited" });
});

elements.atlasSetSelect.addEventListener("change", (event) => {
  const nextSet = event.target.value;
  if (!ATLAS_SET_IDS.has(nextSet) || nextSet === state.atlasSet) {
    return;
  }

  state.atlasSet = nextSet;
  saveSelection();
  startAtlasSession();
});

elements.newGameButton.addEventListener("click", () => {
  if (state.gameType !== "atlas") {
    startGame();
    return;
  }

  if (state.finished) {
    startAtlasSession();
    return;
  }

  if (state.atlasAnswered) {
    advanceAtlas();
  }
});
elements.giveUpButton.addEventListener("click", giveUp);
elements.themeToggle.addEventListener("click", toggleTheme);
elements.flagImage.addEventListener("load", updateFlagFrameAspectRatio);
elements.globeCanvas.addEventListener("pointerdown", beginGlobeDrag);
elements.globeCanvas.addEventListener("pointermove", moveGlobeDrag);
elements.globeCanvas.addEventListener("pointerup", endGlobeDrag);
elements.globeCanvas.addEventListener("pointercancel", endGlobeDrag);
elements.globeCanvas.addEventListener("wheel", handleGlobeWheelZoom, { passive: false });
elements.globeZoomInButton.addEventListener("click", () => adjustGlobeZoom(GLOBE_ZOOM_BUTTON_STEP));
elements.globeZoomOutButton.addEventListener("click", () => adjustGlobeZoom(-GLOBE_ZOOM_BUTTON_STEP));
elements.atlasZoomInButton.addEventListener("click", () => adjustAtlasZoom(1.45));
elements.atlasZoomOutButton.addEventListener("click", () => adjustAtlasZoom(1 / 1.45));
elements.atlasZoomResetButton.addEventListener("click", resetAtlasZoom);

window.addEventListener("resize", () => {
  resizeConfettiCanvas();
  queueGlobeRender();
});

async function init() {
  applyTheme(getSavedTheme());
  initPalette();
  initSettingsModal();
  resizeConfettiCanvas();

  try {
    await Promise.all([
      loadDailyScheduleFor("flag", "./data/flag-daily-schedule.json"),
      loadDailyScheduleFor("globe", "./data/globe-daily-schedule.json")
    ]);
  } catch (error) {
    console.error(error);
    elements.dailyModeButton.disabled = true;
  }

  try {
    await loadCentroids();
    await loadWorldMap();
  } catch (error) {
    console.error(error);
    elements.globleGameButton.disabled = true;
  }

  try {
    await loadMarineAreas();
  } catch (error) {
    console.warn(error);
  }

  try {
    await loadAtlasCountries();
  } catch (error) {
    console.error(error);
    elements.atlasGameButton.disabled = true;
  }

  const savedSelection = getSavedSelection();
  state.gameType = savedSelection.gameType;
  state.playMode = savedSelection.playMode;
  state.atlasSet = savedSelection.atlasSet;

  if (state.gameType !== "atlas" && state.playMode === "daily") {
    const track = state.gameType === "globe" ? "globe" : "flag";
    if (!getScheduleForTrack(track)?.entries?.length) {
      state.playMode = "unlimited";
    }
  }

  if (state.gameType === "globe" && (!state.centroids.size || !state.globeFeatures.length)) {
    state.gameType = "flag";
  }

  if (state.gameType === "atlas" && !state.atlasCountries.length) {
    state.gameType = "flag";
  }

  saveSelection();
  startGame();
}

init();
