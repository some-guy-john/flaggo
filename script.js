const countries = [...window.COUNTRIES].sort((a, b) => a.name.localeCompare(b.name));
const countryByCode = new Map(countries.map((country) => [country.code, country]));

const MAX_GUESSES = 6;
const TOTAL_TILES = 6;
const MODE_STORAGE_KEY = "flaggo-mode-v2";
const HEAT_BANDS_KM = {
  hot: 250,
  warm: 1000
};
const GLOBE_ZOOM_MIN = 0.7;
const GLOBE_ZOOM_MAX = 3.2;
const GLOBE_ZOOM_BUTTON_STEP = 0.25;

const state = {
  target: null,
  guesses: [],
  filteredSuggestions: [],
  highlightedIndex: -1,
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
  globeFeatures: [],
  globeFeatureByCode: new Map(),
  globeRotation: [-20, -18, 0],
  globeZoom: 1,
  globeDragStart: null,
  globeRotationStart: null,
  globeDragging: false,
  globeRenderQueued: false,
  globeProjection: null,
  globePath: null,
  globeAnimationFrame: null
};

const elements = {
  confettiCanvas: document.querySelector("#confetti-canvas"),
  flagGameButton: document.querySelector("#flag-game-button"),
  globleGameButton: document.querySelector("#globle-game-button"),
  dailyModeButton: document.querySelector("#daily-mode-button"),
  unlimitedModeButton: document.querySelector("#unlimited-mode-button"),
  gameCenter: document.querySelector("#game-center"),
  flagStage: document.querySelector("#flag-stage"),
  globleStage: document.querySelector("#globle-stage"),
  gameSidebar: document.querySelector("#game-sidebar"),
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
  countryInput: document.querySelector("#country-input"),
  guessButton: document.querySelector("#guess-button"),
  suggestions: document.querySelector("#suggestions"),
  guessList: document.querySelector("#guess-list"),
  guessesTitle: document.querySelector("#guesses-title"),
  historyCount: document.querySelector("#history-count"),
  newGameButton: document.querySelector("#new-game-button"),
  giveUpButton: document.querySelector("#give-up-button")
};

const confetti = {
  pieces: [],
  animationFrame: null,
  endAt: 0,
  context: null
};

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
      return { gameType: "flag", playMode: "daily" };
    }

    const parsed = JSON.parse(raw);
    const gameType = parsed?.gameType === "globe" ? "globe" : "flag";
    const playMode = parsed?.playMode === "unlimited" ? "unlimited" : "daily";

    return { gameType, playMode };
  } catch {
    return { gameType: "flag", playMode: "daily" };
  }
}

function saveSelection() {
  try {
    window.localStorage.setItem(
      MODE_STORAGE_KEY,
      JSON.stringify({
        gameType: state.gameType,
        playMode: state.playMode
      })
    );
  } catch {
    // Ignore storage failures and continue with in-memory state.
  }
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

async function loadWorldMap() {
  const response = await fetch("./data/world-countries.geojson");

  if (!response.ok) {
    throw new Error(`Failed to load world map: ${response.status}`);
  }

  const payload = await response.json();
  state.globeFeatures = (payload.features || [])
    .filter((feature) => feature?.properties?.["ISO3166-1-Alpha-2"])
    .map((feature) => simplifyFeature(feature, 0.2))
    .filter((feature) => feature.geometry.coordinates.length);
  state.globeFeatureByCode = new Map(
    state.globeFeatures
      .map((feature) => [getFeatureCode(feature), feature])
      .filter(([code]) => Boolean(code))
  );
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

function getSuggestions(query) {
  const normalizedQuery = normalize(query);

  if (!normalizedQuery || state.finished) {
    return [];
  }

  const ranked = countries
    .map((country) => {
      const primaryName = normalize(country.name);
      const normalizedAliases = country.aliases.map((alias) => normalize(alias));
      const primaryStarts = primaryName.startsWith(normalizedQuery);
      const aliasStarts = normalizedAliases.some((alias) => alias.startsWith(normalizedQuery));
      const primaryIncludes = primaryName.includes(normalizedQuery);
      const aliasIncludes = normalizedAliases.some((alias) => alias.includes(normalizedQuery));

      let score = 0;
      if (primaryStarts) {
        score = 4;
      } else if (aliasStarts) {
        score = 3;
      } else if (primaryIncludes) {
        score = 2;
      } else if (aliasIncludes) {
        score = 1;
      }

      return { country, score };
    })
    .filter((entry) => entry.score > 0);

  const hasStrongPrefixMatches = ranked.some((entry) => entry.score >= 3);

  return ranked
    .filter((entry) => !hasStrongPrefixMatches || entry.score >= 3)
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      return a.country.name.localeCompare(b.country.name);
    })
    .slice(0, 8)
    .map((entry) => entry.country);
}

function renderSuggestions() {
  elements.suggestions.innerHTML = "";

  if (!state.filteredSuggestions.length || state.finished) {
    elements.suggestions.classList.remove("visible");
    elements.countryInput.setAttribute("aria-expanded", "false");
    elements.countryInput.removeAttribute("aria-activedescendant");
    return;
  }

  state.filteredSuggestions.forEach((country, index) => {
    const item = document.createElement("li");
    item.className = "suggestion-item";
    item.textContent = country.name;
    item.setAttribute("role", "option");
    item.setAttribute("id", `suggestion-${country.code}`);

    if (index === state.highlightedIndex) {
      item.classList.add("active");
      elements.countryInput.setAttribute("aria-activedescendant", item.id);
    }

    item.addEventListener("mousedown", (event) => {
      event.preventDefault();
      selectSuggestion(country);
    });

    elements.suggestions.appendChild(item);
  });

  if (state.highlightedIndex === -1) {
    elements.countryInput.removeAttribute("aria-activedescendant");
  }

  elements.suggestions.classList.add("visible");
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
  elements.guessList.classList.toggle("globle-board", isGlobe);

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

function clearSuggestions() {
  state.filteredSuggestions = [];
  state.highlightedIndex = -1;
  renderSuggestions();
}

function stepSuggestionHighlight(direction) {
  if (!state.filteredSuggestions.length) {
    return;
  }

  if (state.highlightedIndex < 0) {
    state.highlightedIndex = direction > 0 ? 0 : state.filteredSuggestions.length - 1;
  } else {
    state.highlightedIndex =
      (state.highlightedIndex + direction + state.filteredSuggestions.length) %
      state.filteredSuggestions.length;
  }

  renderSuggestions();
}

function setRoundInteractivity(enabled) {
  elements.countryInput.disabled = !enabled;
  elements.guessButton.disabled = !enabled;
  elements.giveUpButton.disabled = !enabled;
}

function selectSuggestion(country) {
  elements.countryInput.value = country.name;
  clearSuggestions();
  elements.countryInput.focus();
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
  return feature?.properties?.["ISO3166-1-Alpha-2"]?.toLowerCase() || null;
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
  const isDaily = state.playMode === "daily";
  const isUnlimited = state.playMode === "unlimited";

  elements.flagGameButton.classList.toggle("active", isFlag);
  elements.globleGameButton.classList.toggle("active", isGlobe);
  elements.dailyModeButton.classList.toggle("active", isDaily);
  elements.unlimitedModeButton.classList.toggle("active", isUnlimited);

  elements.pageTitle.textContent = isGlobe
    ? "Guess the country from the globe."
    : "Guess the country from its flag.";
  elements.roundTitle.textContent = isGlobe
    ? isDaily ? "Daily globe mystery country" : "Unlimited globe practice"
    : isDaily ? "Daily shared flag" : "Unlimited flag practice";
  elements.guessesTitle.textContent = isGlobe ? "Proximity board" : "Guess board";
  elements.newGameButton.textContent = isGlobe ? "New globe" : "New flag";
  elements.newGameButton.classList.toggle("is-hidden", isDaily);
  elements.gameCenter.classList.toggle("globle-layout", isGlobe);
  elements.flagStage.classList.toggle("is-hidden", isGlobe);
  elements.globleStage.classList.toggle("is-hidden", !isGlobe);

  elements.flagImage.classList.toggle("is-hidden", isGlobe);
  elements.flagMask.classList.toggle("is-hidden", isGlobe);
  elements.globlePanel.classList.toggle("is-hidden", !isGlobe);
  elements.globlePanel.setAttribute("aria-hidden", String(!isGlobe));
}

function finishRound(message, tone) {
  state.finished = true;
  elements.countryInput.value = "";
  clearSuggestions();

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
  clearSuggestions();
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
  clearSuggestions();
  renderGuesses();
  queueGlobeRender();
}

function submitGuess(rawValue) {
  if (state.finished) {
    updateStatus("That round is done. Start another round when you're ready.");
    return;
  }

  const country = findCountry(rawValue);

  if (!country) {
    updateStatus("Pick a valid country from the list or keep typing for suggestions.", "failure");
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
  const nextTarget = getTargetCountryForSelection();
  state.target = nextTarget || pickRandomCountry();
  state.guesses = [];
  state.filteredSuggestions = [];
  state.highlightedIndex = -1;
  state.finished = false;
  state.revealedTiles = state.gameType === "flag" ? 1 : 0;
  state.revealOrder = shuffle(Array.from({ length: TOTAL_TILES }, (_, index) => index));

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

  clearSuggestions();
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

  if (nextPlayMode === "daily") {
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

elements.countryInput.addEventListener("input", (event) => {
  state.filteredSuggestions = getSuggestions(event.target.value);
  state.highlightedIndex = state.filteredSuggestions.length ? 0 : -1;
  renderSuggestions();
});

elements.countryInput.addEventListener("keydown", (event) => {
  if (!state.filteredSuggestions.length) {
    return;
  }

  if (event.key === "ArrowDown") {
    event.preventDefault();
    stepSuggestionHighlight(1);
  }

  if (event.key === "ArrowUp") {
    event.preventDefault();
    stepSuggestionHighlight(-1);
  }

  if (event.key === "Enter" && state.highlightedIndex >= 0) {
    event.preventDefault();
    selectSuggestion(state.filteredSuggestions[state.highlightedIndex]);
  }

  if (event.key === "Tab") {
    event.preventDefault();
    stepSuggestionHighlight(event.shiftKey ? -1 : 1);
  }

  if (event.key === "Escape") {
    clearSuggestions();
  }
});

elements.countryInput.addEventListener("blur", () => {
  window.setTimeout(() => {
    clearSuggestions();
  }, 100);
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

elements.dailyModeButton.addEventListener("click", () => {
  setSelection({ playMode: "daily" });
});

elements.unlimitedModeButton.addEventListener("click", () => {
  setSelection({ playMode: "unlimited" });
});

elements.newGameButton.addEventListener("click", startGame);
elements.giveUpButton.addEventListener("click", giveUp);
elements.globeCanvas.addEventListener("pointerdown", beginGlobeDrag);
elements.globeCanvas.addEventListener("pointermove", moveGlobeDrag);
elements.globeCanvas.addEventListener("pointerup", endGlobeDrag);
elements.globeCanvas.addEventListener("pointercancel", endGlobeDrag);
elements.globeCanvas.addEventListener("wheel", handleGlobeWheelZoom, { passive: false });
elements.globeZoomInButton.addEventListener("click", () => adjustGlobeZoom(GLOBE_ZOOM_BUTTON_STEP));
elements.globeZoomOutButton.addEventListener("click", () => adjustGlobeZoom(-GLOBE_ZOOM_BUTTON_STEP));

window.addEventListener("resize", () => {
  resizeConfettiCanvas();
  queueGlobeRender();
});

async function init() {
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

  const savedSelection = getSavedSelection();
  state.gameType = savedSelection.gameType;
  state.playMode = savedSelection.playMode;

  if (state.playMode === "daily") {
    const track = state.gameType === "globe" ? "globe" : "flag";
    if (!getScheduleForTrack(track)?.entries?.length) {
      state.playMode = "unlimited";
    }
  }

  if (state.gameType === "globe" && (!state.centroids.size || !state.globeFeatures.length)) {
    state.gameType = "flag";
  }

  saveSelection();
  startGame();
}

init();
