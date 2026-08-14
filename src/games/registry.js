/*
 * One descriptor per game.
 *
 * Everything that used to be a `state.gameType === "..."` branch scattered
 * through updateModeUI, startGame, submitGuess and giveUp lives here as data on
 * the game it belongs to. Adding a sixth mode should mean adding one entry,
 * not editing five functions in parallel.
 *
 * Fields that vary within a mode take a context object (see buildContext in
 * round.js) rather than reading state directly, so the descriptors stay
 * declarative and testable.
 */

import { revealAtlasAnswer, startAtlasSession, submitAtlasGuess } from "./atlas.js";
import { giveUpCapitals, pickCapitalTarget, renderCapitalStage, submitCapitalGuess } from "./capitals.js";
import { giveUpFlag, submitFlagGuess } from "./flag.js";
import { giveUpGlobe, submitGlobeGuess } from "./globe.js";
import { giveUpLookalike, startLookalikeSession } from "./lookalike.js";

const TAB_HINT = "Use <kbd>Tab</kbd> and <kbd>Shift + Tab</kbd> to move through matches, then <kbd>Enter</kbd> to autofill.";

const COUNTRY_HINT = `Type to search countries. ${TAB_HINT}`;
const CAPITAL_HINT = `Type to search capital cities. ${TAB_HINT}`;

/* Shared defaults; a descriptor only states what makes it different. */
const BASE = {
  layoutClass: null,
  supportsDaily: false,
  supportsHints: false,
  showsGuessForm: true,
  autocomplete: "list",
  /* Flag-style tile reveal on finish. Inert where the mask is hidden. */
  revealsTilesOnFinish: false,
  duplicateNoun: "another country",
  /* Games resolve a guess one of two ways: submitRaw takes the typed text,
     submitCountry takes a catalog country. A game with neither has no text
     input at all. `start` is only set when a game needs its own setup path. */
  submitRaw: null,
  submitCountry: null,
  start: null,
  revealOrder: (shuffle, total) => shuffle(Array.from({ length: total }, (_, index) => index)),
  /* Round-setup hooks. pickTarget defaults to any country; renderStage draws
     whatever the player looks at; onRoundStart resets per-mode view state. */
  pickTarget: null,
  onRoundStart: null,
  usesMask: true,
  answerNoun: "country",
  introStatus: (ctx) =>
    ctx.isDaily
      ? "Daily flag mode: a separate UTC-dated flag is shared here each day."
      : "Unlimited flag mode: every new round picks another random flag.",
  inputLabel: "Country name",
  placeholder: () => "Type the full country name...",
  inputHint: () => COUNTRY_HINT,
  guessButtonLabel: () => "Guess",
  giveUpLabel: () => "Give up",
  /* Daily hides the button mid-round, then offers a way out that is not a
     retry of today's puzzle. */
  newGameHidden: (ctx) => ctx.isDaily && !ctx.finished
};

const GAMES = {
  flag: {
    ...BASE,
    id: "flag",
    modeButton: "flagGameButton",
    stage: "flagStage",
    supportsDaily: true,
    supportsHints: true,
    revealsTilesOnFinish: true,
    /* Opens two middle tiles first so the reveal is readable from the start. */
    revealOrder: (shuffle) => [1, 4, ...shuffle([0, 2, 3, 5])],
    pageTitle: () => "Guess the country from its flag.",
    roundTitle: (ctx) => (ctx.isDaily ? "Daily shared flag" : "Unlimited flag practice"),
    guessesTitle: "Guess board",
    newGameLabel: () => "New flag",
    submitCountry: submitFlagGuess,
    giveUp: giveUpFlag
  },

  globe: {
    ...BASE,
    id: "globe",
    modeButton: "globleGameButton",
    stage: "globleStage",
    layoutClass: "globle-layout",
    supportsDaily: true,
    supportsHints: true,
    pageTitle: () => "Guess the country from the globe.",
    roundTitle: (ctx) => (ctx.isDaily ? "Daily globe mystery country" : "Unlimited globe practice"),
    guessesTitle: "Proximity board",
    newGameLabel: () => "New globe",
    submitCountry: submitGlobeGuess,
    giveUp: giveUpGlobe,
    /* Snap the globe back to its default view for a fresh round. */
    onRoundStart: (state) => {
      state.globeRotation = [-20, -18, 0];
      state.globeZoom = 1;

      if (state.globeAnimationFrame) {
        cancelAnimationFrame(state.globeAnimationFrame);
        state.globeAnimationFrame = null;
      }
    },
    introStatus: (ctx) =>
      ctx.isDaily
        ? "Daily globe mode: a separate UTC-dated country is shared here each day."
        : "Unlimited globe mode: every new round picks another random country."
  },

  capitals: {
    ...BASE,
    id: "capitals",
    modeButton: "capitalsGameButton",
    stage: "capitalStage",
    layoutClass: "capitals-layout",
    supportsDaily: true,
    pageTitle: () => "Name the capital from the country and its flag.",
    roundTitle: (ctx) => (ctx.isDaily ? "Daily shared capital" : "Unlimited capitals practice"),
    guessesTitle: "Guess board",
    newGameLabel: () => "New capitals",
    inputLabel: "Capital city",
    placeholder: () => "Type the capital city name...",
    inputHint: () => CAPITAL_HINT,
    duplicateNoun: "another capital",
    submitCountry: submitCapitalGuess,
    giveUp: giveUpCapitals,
    /* Capitals draws a country card, not a masked flag. */
    pickTarget: pickCapitalTarget,
    renderStage: renderCapitalStage,
    usesMask: false,
    answerNoun: "capital",
    introStatus: (ctx) =>
      ctx.isDaily
        ? "Daily capitals mode: a shared country is picked each day. Name its capital."
        : "Unlimited capitals mode: every new round shows a country. Name its capital."
  },

  atlas: {
    ...BASE,
    id: "atlas",
    modeButton: "atlasGameButton",
    stage: "atlasStage",
    layoutClass: "atlas-layout",
    autocomplete: "none",
    revealsTilesOnFinish: true,
    pageTitle: (ctx) =>
      ctx.isAtlasCountryMap ? "Name every country on the map." : "Name the highlighted area.",
    roundTitle: (ctx) =>
      ctx.atlasSet.id === "world" ? `All ${ctx.countriesCount} countries` : ctx.atlasSet.label,
    guessesTitle: "Set progress",
    newGameLabel: (ctx) =>
      ctx.isAtlasCountryMap ? "Restart map" : ctx.finished ? "Restart set" : "Next map",
    newGameHidden: (ctx) =>
      ctx.isAtlasCountryMap ? !ctx.finished : !ctx.atlasAnswered && !ctx.finished,
    giveUpLabel: (ctx) => (ctx.isAtlasCountryMap ? "Give up" : "Reveal answer"),
    guessButtonLabel: (ctx) => (ctx.isAtlasCountryMap ? "Name country" : "Check"),
    inputLabel: "Geographic area name",
    placeholder: (ctx) =>
      ctx.isAtlasCountryMap ? "Type the full country name..." : "Name the highlighted area...",
    inputHint: (ctx) =>
      ctx.isAtlasCountryMap
        ? "Type any country name. Click a country only when you want to reveal it."
        : "Enter the highlighted area's full name. Spelling help appears only after an unrecognized answer.",
    /* Atlas scores the raw text itself: its answers include seas and
       continents, which are not in the country catalog. */
    submitRaw: submitAtlasGuess,
    giveUp: revealAtlasAnswer,
    start: startAtlasSession
  },

  lookalike: {
    ...BASE,
    id: "lookalike",
    modeButton: "lookalikeGameButton",
    stage: "lookalikeStage",
    layoutClass: "lookalike-layout",
    showsGuessForm: false,
    pageTitle: () => "Pick the right flag from the lookalikes.",
    roundTitle: () => "Unlimited lookalike practice",
    guessesTitle: "Pick history",
    newGameLabel: () => "New set",
    newGameHidden: () => false,
    /* No text input: picks come from the flag cards. */
    giveUp: giveUpLookalike,
    start: startLookalikeSession
  }
};

export const GAME_IDS = Object.keys(GAMES);

export function getGame(id) {
  return GAMES[id] || GAMES.flag;
}

export default GAMES;
