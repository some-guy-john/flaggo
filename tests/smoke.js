/*
 * Flaggo smoke suite.
 *
 * Drives the real app through the DOM only -- no internal globals, no imports.
 * That is deliberate: this file must produce identical results before and after
 * script.js is split into ES modules, so it can act as the refactor's gate.
 *
 * Usage: load the page, inject this file, then `await window.__flaggoSmoke()`.
 * Returns { pass, fail, total, results: [{ name, ok, detail }] }.
 */
(function () {
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];

  const sleep = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

  /* Poll until `predicate` is truthy. Everything here must tolerate async data
     loading, because Phase 2 makes several modes fetch on first use. */
  async function until(predicate, { timeout = 8000, interval = 50, label = "condition" } = {}) {
    const deadline = Date.now() + timeout;
    let last = null;

    while (Date.now() < deadline) {
      try {
        last = predicate();
        if (last) {
          return last;
        }
      } catch (error) {
        last = error;
      }
      await sleep(interval);
    }

    throw new Error(`timed out waiting for ${label}`);
  }

  const isVisible = (el) => Boolean(el) && !el.classList.contains("is-hidden") && el.offsetParent !== null;

  const STAGES = {
    flag: "#flag-stage",
    globe: "#globle-stage",
    atlas: "#atlas-stage",
    capitals: "#capital-stage",
    lookalike: "#lookalike-stage"
  };

  const MODE_BUTTONS = {
    flag: "#flag-game-button",
    globe: "#globle-game-button",
    atlas: "#atlas-game-button",
    capitals: "#capitals-game-button",
    lookalike: "#lookalike-game-button"
  };

  /* Country catalog is read from source text rather than a global, so this
     works whether countries.js is a window assignment or an ES module. */
  let catalog = null;

  async function loadCatalog() {
    if (catalog) {
      return catalog;
    }

    const candidates = ["./countries.js", "./src/data/countries.js"];
    let text = null;

    for (const path of candidates) {
      try {
        const response = await fetch(path);
        if (response.ok) {
          text = await response.text();
          break;
        }
      } catch (error) {
        /* try the next path */
      }
    }

    if (!text) {
      throw new Error("could not locate countries source");
    }

    catalog = [...text.matchAll(/name:\s*"([^"]+)",\s*code:\s*"([a-z]{2})"/g)]
      .map((match) => ({ name: match[1], code: match[2] }));

    if (catalog.length < 150) {
      throw new Error(`parsed only ${catalog.length} countries from source`);
    }

    return catalog;
  }

  const nameForCode = (code) => catalog.find((entry) => entry.code === code)?.name || null;
  const codeFromFlagSrc = (src) => (src || "").match(/\/([a-z]{2})\.png/)?.[1] || null;

  async function selectMode(mode) {
    $(MODE_BUTTONS[mode]).click();
    await until(() => isVisible($(STAGES[mode])), { label: `${mode} stage visible` });
    /* Let the round settle: the sidebar re-renders after the stage swaps. */
    await sleep(120);
  }

  async function setPlayMode(playMode) {
    const button = playMode === "daily" ? $("#daily-mode-button") : $("#unlimited-mode-button");
    if (!isVisible(button)) {
      return false;
    }
    button.click();
    await sleep(150);
    return true;
  }

  function submitGuess(text) {
    const input = $("#country-input");
    input.value = text;
    /* Submit via the form rather than Enter: Enter is intercepted by the
       autocomplete and spelling-correction handlers. */
    $("#guess-form").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  }

  const guessCount = () => $$("#guess-list .guess-item:not(.empty)").length;
  const revealedTiles = () => $$("#flag-mask .mask-tile.revealed").length;
  const statusText = () => ($("#status-message")?.textContent || "").trim();
  const boardText = () => ($("#guess-list")?.textContent || "") + " " + ($("#history-count")?.textContent || "");

  /* Canvas rendering is driven by requestAnimationFrame, which browsers park
     when the page is not compositing (headless pane, background tab). Probe it
     once so those checks report as skipped rather than as false failures. */
  async function rafRuns() {
    return new Promise((resolve) => {
      let fired = false;
      requestAnimationFrame(() => {
        fired = true;
        resolve(true);
      });
      window.setTimeout(() => resolve(fired), 1000);
    });
  }

  /* ---------------------------------------------------------------- runner */

  const results = [];

  async function check(name, fn) {
    try {
      const detail = await fn();
      results.push({ name, ok: true, detail: detail == null ? "" : String(detail) });
    } catch (error) {
      results.push({ name, ok: false, detail: error?.message || String(error) });
    }
  }

  function skip(name, reason) {
    results.push({ name, ok: true, skipped: true, detail: `skipped: ${reason}` });
  }

  function assert(condition, message) {
    if (!condition) {
      throw new Error(message);
    }
  }

  async function run() {
    results.length = 0;
    const storageBackup = JSON.stringify(localStorage);

    await loadCatalog();
    const animates = await rafRuns();

    /* ---------------------------------------------------------- boot */

    await check("boot: flag stage renders with an image", async () => {
      await selectMode("flag");
      const img = $("#flag-image");
      await until(() => codeFromFlagSrc(img.src), { label: "flag image src" });
      const code = codeFromFlagSrc(img.src);
      assert(nameForCode(code), `flag code ${code} not in catalog`);
      return `code=${code}`;
    });

    await check("boot: mask renders six tiles", () => {
      const tiles = $$("#flag-mask .mask-tile").length;
      assert(tiles === 6, `expected 6 mask tiles, got ${tiles}`);
      return "6 tiles";
    });

    /* ------------------------------------------------- flag round flow */

    await check("flag: unlimited mode is selectable", async () => {
      const ok = await setPlayMode("unlimited");
      assert(ok, "unlimited button not visible in flag mode");
      return "ok";
    });

    await check("flag: wrong guess records a guess and reveals a tile", async () => {
      $("#new-game-button").click();
      await sleep(200);

      const answer = codeFromFlagSrc($("#flag-image").src);
      const wrong = catalog.find((entry) => entry.code !== answer);
      const tilesBefore = revealedTiles();
      const countBefore = guessCount();

      submitGuess(wrong.name);
      await until(() => guessCount() > countBefore, { label: "guess recorded" });

      const tilesAfter = revealedTiles();
      assert(tilesAfter > tilesBefore, `tiles did not advance (${tilesBefore} -> ${tilesAfter})`);
      return `guesses ${countBefore}->${guessCount()}, tiles ${tilesBefore}->${tilesAfter}`;
    });

    await check("flag: unknown input is rejected, not recorded", async () => {
      const countBefore = guessCount();
      submitGuess("Notacountryxyz");
      await sleep(250);
      assert(guessCount() === countBefore, "unknown country was recorded as a guess");
      return "rejected";
    });

    await check("flag: correct guess wins the round", async () => {
      $("#new-game-button").click();
      await sleep(200);

      const answer = codeFromFlagSrc($("#flag-image").src);
      const name = nameForCode(answer);
      assert(name, `no catalog name for ${answer}`);

      submitGuess(name);
      await until(() => revealedTiles() === 6, { label: "all tiles revealed on win" });

      const status = statusText();
      assert(status.length > 0, "status message empty after win");
      return `won on ${name}`;
    });

    await check("flag: give up finishes the round and reveals the answer", async () => {
      $("#new-game-button").click();
      await sleep(200);

      const answer = codeFromFlagSrc($("#flag-image").src);
      const name = nameForCode(answer);

      $("#give-up-button").click();
      /* The answer lands on the guess board; the status only points at it. */
      await until(() => boardText().includes(name), { label: "answer revealed on board" });
      assert(statusText().length > 0, "status empty after give up");
      assert(revealedTiles() === 6, `expected all tiles revealed, got ${revealedTiles()}`);
      return `revealed ${name}`;
    });

    /* --------------------------------------------------- autocomplete */

    await check("input: typing surfaces country suggestions", async () => {
      $("#new-game-button").click();
      await sleep(200);

      const input = $("#country-input");
      input.value = "unit";
      input.dispatchEvent(new Event("input", { bubbles: true }));

      const items = await until(
        () => {
          const found = $$("#country-suggestions li");
          return found.length ? found : null;
        },
        { label: "suggestions list" }
      );

      input.value = "";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      return `${items.length} suggestions`;
    });

    /* --------------------------------------------------------- modes */

    await check("mode: capitals renders a country and its flag", async () => {
      await selectMode("capitals");
      const name = await until(
        () => $("#capital-country-name")?.textContent?.trim() || null,
        { label: "capital country name" }
      );
      assert(name !== "Country", "capital country name still placeholder");
      await until(() => codeFromFlagSrc($("#capital-flag-image").src), { label: "capital flag image" });
      return name;
    });

    await check("mode: tricky renders a group of flag choices", async () => {
      await selectMode("lookalike");
      const cards = await until(
        () => {
          const found = $$("#lookalike-flags-grid img, #lookalike-flags-grid button");
          return found.length >= 2 ? found : null;
        },
        { label: "lookalike cards" }
      );
      const prompt = $("#lookalike-country-name")?.textContent?.trim();
      assert(prompt, "lookalike prompt is empty");
      return `${cards.length} cards, prompt=${prompt}`;
    });

    if (animates) {
      await check("mode: globe renders a canvas with drawn pixels", async () => {
        await selectMode("globe");
        const canvas = $("#globe-canvas");

        await until(
          () => canvas.width > 300 && canvas.height > 150,
          { timeout: 12000, label: "globe canvas backing store sized" }
        );

        await until(
          () => {
            const { data } = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height);
            for (let i = 3; i < data.length; i += 4 * 97) {
              if (data[i] !== 0) {
                return true;
              }
            }
            return false;
          },
          { timeout: 12000, label: "globe pixels drawn" }
        );

        return `${canvas.width}x${canvas.height}`;
      });
    } else {
      skip("mode: globe renders a canvas with drawn pixels", "requestAnimationFrame is parked");
      await selectMode("globe");
    }

    await check("mode: globe guess records a distance reading", async () => {
      const countBefore = guessCount();
      const guess = catalog.find((entry) => entry.code === "br") || catalog[0];
      submitGuess(guess.name);
      await until(() => guessCount() > countBefore, { timeout: 10000, label: "globe guess recorded" });
      const text = $("#guess-list .guess-item")?.textContent || "";
      assert(/\d/.test(text), "globe guess row has no numeric distance");
      return text.replace(/\s+/g, " ").trim().slice(0, 60);
    });

    await check("mode: atlas renders the world map", async () => {
      await selectMode("atlas");
      const paths = await until(
        () => {
          const found = $$("#atlas-map path");
          return found.length > 100 ? found : null;
        },
        { timeout: 15000, label: "atlas country paths" }
      );
      const position = $("#atlas-position")?.textContent || "";
      assert(/\d/.test(position), "atlas position counter has no number");
      return `${paths.length} paths, ${position.trim()}`;
    });

    /* ------------------------------------------------------ settings */

    await check("settings: modal opens and closes", async () => {
      $("#settings-button").click();
      await until(() => $("#modal-overlay").classList.contains("open"), { label: "modal open" });
      $("#modal-close").click();
      await until(() => !$("#modal-overlay").classList.contains("open"), { label: "modal closed" });
      return "ok";
    });

    await check("settings: palette change rewrites CSS variables", async () => {
      const read = () => getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
      const before = read();

      $("#settings-button").click();
      await until(() => $("#modal-overlay").classList.contains("open"), { label: "modal open" });

      const target = $$(".palette-card").find((card) => !card.classList.contains("selected"));
      assert(target, "no unselected palette card found");
      target.click();
      await until(() => read() !== before, { label: "--accent changed" });

      const after = read();
      $$(".palette-card").find((card) => card.dataset.palette === "sage")?.click();
      await sleep(100);
      $("#modal-close").click();
      await sleep(100);
      return `${before} -> ${after}`;
    });

    await check("settings: theme toggle flips light and dark", async () => {
      const toggle = $("#theme-toggle");
      const before = document.documentElement.dataset.theme || document.body.dataset.theme || "";
      toggle.click();
      await sleep(150);
      const after = document.documentElement.dataset.theme || document.body.dataset.theme || "";
      assert(after !== before, `theme did not change (stayed "${before}")`);
      toggle.click();
      await sleep(150);
      return `${before} -> ${after}`;
    });

    /* ------------------------------------------------ daily behaviour */

    await check("daily: flag daily mode produces a target", async () => {
      await selectMode("flag");
      const ok = await setPlayMode("daily");
      assert(ok, "daily button not visible");
      const code = await until(() => codeFromFlagSrc($("#flag-image").src), { label: "daily flag" });
      assert(nameForCode(code), `daily code ${code} not in catalog`);
      return `code=${code}`;
    });

    await check("daily: same target is served twice in a row", async () => {
      const first = codeFromFlagSrc($("#flag-image").src);
      $("#flag-game-button").click();
      await sleep(250);
      const second = codeFromFlagSrc($("#flag-image").src);
      assert(first === second, `daily target changed: ${first} -> ${second}`);
      return `stable at ${first}`;
    });

    /* ------------------------------------------- persistence and stats */

    await check("daily: a played round is written to storage", async () => {
      await selectMode("flag");
      await setPlayMode("daily");

      const answer = codeFromFlagSrc($("#flag-image").src);
      const record = JSON.parse(localStorage.getItem("flaggo-progress-v1") || "{}");
      const today = new Date().toISOString().slice(0, 10);
      const entry = record[`flag:${today}`];

      /* The earlier daily checks only read the target, so seed one guess. */
      if (!entry || !entry.guesses.length) {
        const wrong = catalog.find((c) => c.code !== answer);
        submitGuess(wrong.name);
        await sleep(300);
      }

      const after = JSON.parse(localStorage.getItem("flaggo-progress-v1") || "{}")[`flag:${today}`];
      assert(after, "no progress record written for today");
      assert(after.code === answer, `stored code ${after.code} != shown ${answer}`);
      return `${after.guesses.length} guess(es) stored`;
    });

    await check("daily: a finished round locks and records a stat", async () => {
      const answer = codeFromFlagSrc($("#flag-image").src);
      const name = nameForCode(answer);

      if (!$("#country-input").disabled) {
        submitGuess(name);
        await until(() => $("#country-input").disabled, { label: "round locked after win" });
      }

      const stats = JSON.parse(localStorage.getItem("flaggo-stats-v1") || "{}");
      assert(stats.flag, "no flag stats recorded");
      assert(stats.flag.played >= 1, "played count did not increment");

      const label = $("#new-game-button").textContent.trim();
      assert(/unlimited/i.test(label), `expected a non-retry action, got "${label}"`);

      /* The old behaviour re-rolled the same daily with a clean board. */
      $("#new-game-button").click();
      await sleep(400);
      assert(
        $("#unlimited-mode-button").classList.contains("active"),
        "finished daily still allowed a same-day retry"
      );

      return `played=${stats.flag.played} streak=${stats.flag.currentStreak}`;
    });

    await check("daily: a finished round is not counted twice on revisit", async () => {
      const before = JSON.parse(localStorage.getItem("flaggo-stats-v1")).flag.played;

      await setPlayMode("daily");
      await sleep(300);
      await selectMode("capitals");
      await selectMode("flag");
      await setPlayMode("daily");
      await sleep(300);

      const after = JSON.parse(localStorage.getItem("flaggo-stats-v1")).flag.played;
      assert(after === before, `played went ${before} -> ${after} on revisit`);
      return `stable at ${after}`;
    });

    /* --------------------------------------------------------- teardown */

    try {
      localStorage.clear();
      const restored = JSON.parse(storageBackup);
      Object.keys(restored).forEach((key) => localStorage.setItem(key, restored[key]));
    } catch (error) {
      /* leave storage as-is if restore fails */
    }

    const skipped = results.filter((entry) => entry.skipped).length;
    const pass = results.filter((entry) => entry.ok && !entry.skipped).length;

    return {
      pass,
      fail: results.length - pass - skipped,
      skipped,
      total: results.length,
      animates,
      results
    };
  }

  window.__flaggoSmoke = run;
})();
