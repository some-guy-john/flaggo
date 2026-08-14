import { confetti, elements } from "../core/state.js";

export function resizeConfettiCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const { innerWidth, innerHeight } = window;

  elements.confettiCanvas.width = Math.floor(innerWidth * dpr);
  elements.confettiCanvas.height = Math.floor(innerHeight * dpr);
  elements.confettiCanvas.style.width = `${innerWidth}px`;
  elements.confettiCanvas.style.height = `${innerHeight}px`;

  confetti.context = elements.confettiCanvas.getContext("2d");
  confetti.context.setTransform(dpr, 0, 0, dpr, 0, 0);
}

export function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

export function launchConfetti() {
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

export function renderConfetti() {
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
