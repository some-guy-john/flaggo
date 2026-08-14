import { GLOBE_WHEEL_SENSITIVITY, GLOBE_ZOOM_MAX, GLOBE_ZOOM_MIN } from "../core/constants.js";
import { clamp } from "../core/geo.js";
import { elements, state } from "../core/state.js";
import { getFeatureCode } from "./data.js";
import { getGuessColor } from "../ui/board.js";

export function getHeatFillColor(distanceKm) {
  const clampedDistance = clamp(distanceKm, 0, 12000);
  const closeness = 1 - clampedDistance / 12000;
  const red = Math.round(246 - closeness * 128);
  const green = Math.round(194 - closeness * 176);
  const blue = Math.round(194 - closeness * 176);

  return `rgb(${red}, ${green}, ${blue})`;
}

export function ensureGlobeRenderer(width, height) {
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

export function adjustGlobeZoom(factor) {
  if (state.gameType !== "globe") {
    return;
  }

  state.globeZoom = clamp(state.globeZoom * factor, GLOBE_ZOOM_MIN, GLOBE_ZOOM_MAX);
  queueGlobeRender();
}

export function handleGlobeWheelZoom(event) {
  if (state.gameType !== "globe") {
    return;
  }

  event.preventDefault();
  const deltaScale = event.deltaMode === WheelEvent.DOM_DELTA_LINE
    ? 16
    : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
      ? elements.globeCanvas.clientHeight
      : 1;
  const factor = Math.exp(clamp(-event.deltaY * deltaScale * GLOBE_WHEEL_SENSITIVITY, -0.45, 0.45));
  adjustGlobeZoom(factor);
}

export function renderGlobe() {
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
  const renderWidth = Math.round(width * dpr);
  const renderHeight = Math.round(height * dpr);
  if (canvas.width !== renderWidth || canvas.height !== renderHeight) {
    canvas.width = renderWidth;
    canvas.height = renderHeight;
  }

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

export function queueGlobeRender() {
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

export function globePointerVector(event, rotation = state.globeRotation) {
  const bounds = elements.globeCanvas.getBoundingClientRect();
  const centerX = bounds.width / 2;
  const centerY = bounds.height / 2;
  const radius = Math.min(bounds.width, bounds.height) * 0.485 * state.globeZoom;
  let x = event.clientX - bounds.left;
  let y = event.clientY - bounds.top;
  const offsetX = x - centerX;
  const offsetY = y - centerY;
  const distance = Math.hypot(offsetX, offsetY);

  if (distance > radius) {
    x = centerX + offsetX * radius / distance;
    y = centerY + offsetY * radius / distance;
  }

  ensureGlobeRenderer(bounds.width, bounds.height);
  const coordinates = state.globeProjection.rotate(rotation).invert([x, y]);
  const longitude = coordinates[0] * Math.PI / 180;
  const latitude = coordinates[1] * Math.PI / 180;
  const cosLatitude = Math.cos(latitude);
  return [cosLatitude * Math.cos(longitude), cosLatitude * Math.sin(longitude), Math.sin(latitude)];
}

export function globeRotationToQuaternion([longitude, latitude, roll]) {
  const lambda = longitude * Math.PI / 360;
  const phi = latitude * Math.PI / 360;
  const gamma = roll * Math.PI / 360;
  const sinLambda = Math.sin(lambda);
  const cosLambda = Math.cos(lambda);
  const sinPhi = Math.sin(phi);
  const cosPhi = Math.cos(phi);
  const sinGamma = Math.sin(gamma);
  const cosGamma = Math.cos(gamma);

  return [
    cosLambda * cosPhi * cosGamma + sinLambda * sinPhi * sinGamma,
    sinLambda * cosPhi * cosGamma - cosLambda * sinPhi * sinGamma,
    cosLambda * sinPhi * cosGamma + sinLambda * cosPhi * sinGamma,
    cosLambda * cosPhi * sinGamma - sinLambda * sinPhi * cosGamma
  ];
}

export function globeQuaternionDelta(from, to) {
  const cross = [
    from[1] * to[2] - from[2] * to[1],
    from[2] * to[0] - from[0] * to[2],
    from[0] * to[1] - from[1] * to[0]
  ];
  const crossLength = Math.hypot(...cross);
  const dot = clamp(from[0] * to[0] + from[1] * to[1] + from[2] * to[2], -1, 1);

  if (crossLength < 1e-8) {
    return [1, 0, 0, 0];
  }

  const halfAngle = Math.acos(dot) / 2;
  const scale = Math.sin(halfAngle) / crossLength;
  return [Math.cos(halfAngle), cross[2] * scale, -cross[1] * scale, cross[0] * scale];
}

export function multiplyGlobeQuaternions(left, right) {
  return [
    left[0] * right[0] - left[1] * right[1] - left[2] * right[2] - left[3] * right[3],
    left[0] * right[1] + left[1] * right[0] + left[2] * right[3] - left[3] * right[2],
    left[0] * right[2] - left[1] * right[3] + left[2] * right[0] + left[3] * right[1],
    left[0] * right[3] + left[1] * right[2] - left[2] * right[1] + left[3] * right[0]
  ];
}

export function globeQuaternionToRotation([w, x, y, z]) {
  const radiansToDegrees = 180 / Math.PI;
  return [
    Math.atan2(2 * (w * x + y * z), 1 - 2 * (x * x + y * y)) * radiansToDegrees,
    Math.asin(clamp(2 * (w * y - z * x), -1, 1)) * radiansToDegrees,
    Math.atan2(2 * (w * z + x * y), 1 - 2 * (y * y + z * z)) * radiansToDegrees
  ];
}

export function rotateGlobeToCountry(code, animate = true) {
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
  const longitudeDelta = ((targetRotation[0] - startRotation[0] + 540) % 360) - 180;
  const startTime = performance.now();
  const duration = 380;

  const animateFrame = (now) => {
    const progress = clamp((now - startTime) / duration, 0, 1);
    const eased = 1 - Math.pow(1 - progress, 3);

    state.globeRotation = [
      startRotation[0] + longitudeDelta * eased,
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

export function beginGlobeDrag(event) {
  if (state.gameType !== "globe") {
    return;
  }

  if (state.globeAnimationFrame) {
    cancelAnimationFrame(state.globeAnimationFrame);
    state.globeAnimationFrame = null;
  }
  state.globeDragging = true;
  state.globeRotationStart = [...state.globeRotation];
  state.globeDragVector = globePointerVector(event, state.globeRotationStart);
  state.globeRotationQuaternion = globeRotationToQuaternion(state.globeRotationStart);
  elements.globeCanvas.classList.add("dragging");
  elements.globeCanvas.setPointerCapture(event.pointerId);
}

export function moveGlobeDrag(event) {
  if (!state.globeDragging) {
    return;
  }

  const currentVector = globePointerVector(event, state.globeRotationStart);
  const delta = globeQuaternionDelta(state.globeDragVector, currentVector);
  state.globeRotation = globeQuaternionToRotation(
    multiplyGlobeQuaternions(state.globeRotationQuaternion, delta)
  );

  queueGlobeRender();
}

export function endGlobeDrag(event) {
  if (!state.globeDragging) {
    return;
  }

  state.globeDragging = false;
  state.globeDragVector = null;
  state.globeRotationStart = null;
  state.globeRotationQuaternion = null;
  elements.globeCanvas.classList.remove("dragging");

  if (event?.pointerId != null) {
    elements.globeCanvas.releasePointerCapture(event.pointerId);
  }
}
