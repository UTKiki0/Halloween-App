// The character's speech bubble: pops up now and then with a line of text, above its head.
//
// This is the Story 1 text hint: it hints at the goal in the character's own words without
// saying what to do. The owner (character.js) decides WHEN speaking is allowed and WHERE the
// head is; this module only handles timing and drawing.
//
// Timing runs on game time: `update(dt, allowed)` is only called while the scene is playing, so
// pausing freezes the bubble and its timers together with everything else.

const FIRST_DELAY = 6;          // seconds of play before the first bubble
const INTERVAL = [14, 22];      // random gap between bubbles
const VISIBLE_SECONDS = 4.5;    // how long a bubble stays up
const LEAVE_SECONDS = 0.25;     // fade-out at the end
const INTERRUPTED_RETRY = 4;    // after an interruption, wait at least this long before speaking again
const EDGE_MARGIN = 1.5;        // keep the bubble this far (stage units) from the screen edges

const random = (min, max) => min + Math.random() * (max - min);

export function createSpeech(stage, line) {
  const root = document.getElementById('speech');
  if (!root) return { update() {}, render() {}, reset() {} };
  const bubble = root.querySelector('.speech-bubble');
  const text = root.querySelector('.speech-text');
  const live = document.getElementById('speech-live');   // screen-reader copy of the line

  const state = { wait: FIRST_DELAY, shown: 0, visible: false };
  const stageWidthPx = () => stage.clientWidth;

  function show() {
    state.visible = true;
    state.shown = 0;
    text.textContent = line;
    if (live) live.textContent = line;
    root.classList.remove('is-leaving');
    root.classList.add('is-visible');
  }
  function hide() {
    state.visible = false;
    text.textContent = '';
    if (live) live.textContent = '';
    root.classList.remove('is-visible', 'is-leaving');
  }

  // allowed: whether the character may speak right now (standing or walking, story not started).
  function update(dt, allowed) {
    if (!allowed) {
      if (state.visible) { hide(); state.wait = Math.max(state.wait, INTERRUPTED_RETRY); }
      return;
    }
    if (state.visible) {
      state.shown += dt;
      if (state.shown >= VISIBLE_SECONDS - LEAVE_SECONDS) root.classList.add('is-leaving');
      if (state.shown >= VISIBLE_SECONDS) { hide(); state.wait = random(...INTERVAL); }
    } else {
      state.wait -= dt;
      if (state.wait <= 0) show();
    }
  }

  // headX: head center in stage units; headTop: top of the head in stage units (from the stage top).
  function render(headX, headTop) {
    if (!state.visible) return;
    const width = (bubble.offsetWidth / stageWidthPx()) * 100;        // bubble width in stage units
    const half = width / 2;
    const center = Math.min(100 - half - EDGE_MARGIN, Math.max(half + EDGE_MARGIN, headX));
    root.style.left = `${center}%`;
    root.style.top = `${(headTop / 100) * stageWidthPx()}px`;
    // The tail keeps pointing at the head even when the bubble is held back from an edge.
    const tail = 50 + ((headX - center) / width) * 100;
    bubble.style.setProperty('--tail', `${Math.min(88, Math.max(12, tail))}%`);
  }

  // Back to the start of the schedule (used when the story is reset).
  function reset() {
    hide();
    state.wait = FIRST_DELAY;
  }

  return { update, render, reset };
}
