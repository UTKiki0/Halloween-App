// The character's speech bubble progresses from a wish to a clue to an instruction.
// character.js chooses the current story's lines and when the character may speak.
//
// Timing runs on game time: `update(dt, allowed)` is only called while the scene is playing, so
// pausing freezes the bubble and its timers together with everything else.

const HINT_TIMES = [6, 25, 45]; // seconds available for exploration within this story
const REPEAT_INTERVAL = 25;    // repeat the final instruction, measured start to start
const VISIBLE_SECONDS = 4.5;    // how long a bubble stays up
const LEAVE_SECONDS = 0.25;     // fade-out at the end
const INTERRUPTED_RETRY = 4;    // after an interruption, wait at least this long before speaking again
const EDGE_MARGIN = 1.5;        // keep the bubble this far (stage units) from the screen edges

export function createSpeech(stage, hints) {
  const root = document.getElementById('speech');
  if (!root) return { update() {}, render() {}, reset() {}, setHints() {}, say() {}, clear() {} };
  const bubble = root.querySelector('.speech-bubble');
  const text = root.querySelector('.speech-text');
  const live = document.getElementById('speech-live');   // screen-reader copy of the line

  const state = { elapsed: 0, nextAt: HINT_TIMES[0], index: 0, startedAt: 0,
    retry: 0, shown: 0, visible: false };
  let scripted = false;
  const stageWidthPx = () => stage.clientWidth;

  function show(message) {
    state.visible = true;
    state.shown = 0;
    text.textContent = message;
    if (live) live.textContent = message;
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
    if (scripted) return;
    if (!allowed) {
      // A grab hides the bubble and freezes progression. Retry the interrupted
      // line after release so a brief glimpse doesn't skip a whole hint level.
      if (state.visible) { hide(); state.retry = INTERRUPTED_RETRY; }
      return;
    }
    state.elapsed += dt;
    state.retry = Math.max(0, state.retry - dt);
    if (state.visible) {
      state.shown += dt;
      if (state.shown >= VISIBLE_SECONDS - LEAVE_SECONDS) root.classList.add('is-leaving');
      if (state.shown >= VISIBLE_SECONDS) {
        hide();
        const finishedIndex = state.index;
        state.index = Math.min(state.index + 1, hints.length - 1);
        const nextAt = finishedIndex < hints.length - 1
          ? HINT_TIMES[state.index] : state.startedAt + REPEAT_INTERVAL;
        state.nextAt = Math.max(nextAt, state.elapsed + INTERRUPTED_RETRY);
      }
    } else if (state.elapsed >= state.nextAt && state.retry === 0) {
      state.startedAt = state.elapsed;
      show(hints[state.index]);
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
    scripted = false;
    hide();
    state.elapsed = state.index = state.retry = state.shown = state.startedAt = 0;
    state.nextAt = HINT_TIMES[0];
  }

  function setHints(nextHints) {
    hints = nextHints;
    reset();
  }
  function say(message) { scripted = true; show(message); }
  function clear() { scripted = false; hide(); }
  return { update, render, reset, setHints, say, clear };
}
