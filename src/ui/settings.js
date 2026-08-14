import { SITE_ZOOM_MAX, SITE_ZOOM_MIN, SITE_ZOOM_STEP, SITE_ZOOM_STORAGE_KEY } from "../core/constants.js";
import { elements, state } from "../core/state.js";
import { applyPalette } from "./theme.js";
import { renderStatsPanel } from "./statsPanel.js";

export function playCorrectSound() {
  if (!state.soundEnabled) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    gain.gain.value = 0.15;

    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.08);
    osc.connect(gain);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.12);

    const osc2 = ctx.createOscillator();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(1320, ctx.currentTime + 0.1);
    osc2.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.16);
    const gain2 = ctx.createGain();
    gain2.gain.value = 0.08;
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.1);
    osc2.stop(ctx.currentTime + 0.24);
  } catch (_) {}
}

export function initSettingsModal() {
  const open = () => {
    renderStatsPanel();
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

export function applySiteZoom(value, { persist = true } = {}) {
  const zoom = Math.min(SITE_ZOOM_MAX, Math.max(SITE_ZOOM_MIN, Number(value) || 1));
  state.siteZoom = Math.round(zoom * 100) / 100;
  document.documentElement.style.fontSize = `${Math.round(state.siteZoom * 100)}%`;
  elements.siteZoomValue.value = `${Math.round(state.siteZoom * 100)}%`;
  elements.siteZoomValue.textContent = elements.siteZoomValue.value;
  elements.siteZoomOutButton.disabled = state.siteZoom <= SITE_ZOOM_MIN;
  elements.siteZoomInButton.disabled = state.siteZoom >= SITE_ZOOM_MAX;

  if (persist) {
    localStorage.setItem(SITE_ZOOM_STORAGE_KEY, String(state.siteZoom));
  }
}

export function initSiteZoom() {
  const saved = Number(localStorage.getItem(SITE_ZOOM_STORAGE_KEY));
  applySiteZoom(Number.isFinite(saved) && saved > 0 ? saved : 1, { persist: false });
  elements.siteZoomOutButton.addEventListener("click", () => applySiteZoom(state.siteZoom - SITE_ZOOM_STEP));
  elements.siteZoomInButton.addEventListener("click", () => applySiteZoom(state.siteZoom + SITE_ZOOM_STEP));
}
