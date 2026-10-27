// Story contract: canTrigger, start, update, render, reset, onLand, plus phase/status getters.
// Character movement stays in character.js; each story owns its timeline, cues, effects and hint.

export const COFFIN_HINTS = [
  'I really want a vampire outfit for Halloween.',
  'Maybe that coffin could help with my costume…',
  'Drag me onto the coffin and let go!',
];

// ---------- Story 1: the vampire coffin ----------
// Coffin geometry in stage units, measured from assets/art/fg-scene.png (scene drawn at 94% width,
// 0.0999 stage units per art pixel): the whole coffin spans about x 4-34, y 110-150.
const COFFIN = {
  zone: { left: 4, right: 34, top: 108, bottom: 151 },   // release the pointer inside this to start the story
  hideX: 19,       // where the character's head center ends up, inside the coffin
  hideFistY: 122,  // where its raised fist ends up (the figure hangs below it and shrinks around it, so
                   // the whole body is behind the coffin: at 0.55 scale it spans about y 122-144)
  exitX: 44,       // where the vampire lands after leaping out
};
const STORY = {
  drop: 0.9,            // seconds: drops into the coffin and shrinks
  rattle: 3.9,          // seconds: the coffin rattles, glows, and mist rises (audio goes here later); whole story is about 6s
  hiddenScale: 0.55,    // size while inside the coffin
  leap: 150,            // upward speed of the vampire's leap out (stage units per second)
  grow: 0.35,           // seconds for the vampire to grow back to full size
  dupHold: 0.35,        // seconds after the leap before the coffin copy starts to fade away
  tail: 3.0,            // seconds after the leap that effects are still running
};
STORY.emergeAt = STORY.drop + STORY.rattle;   // story clock time of the flash and the leap

// Sound cues on the story clock (seconds from release). Sounds are in js/audio.js; trim points
// were chosen from loudness measurements of each file (see research.md).
//   whoosh  - the shrink into the coffin
//   scratch - something restless inside; quiet source (peak -18 dBFS), so boosted; builds to a peak
//             just before the flash when played from 0.5 s
//   drone   - rises under the glow (the file itself rises from -33 dB)
//   knock   - wooden knocks that speed up and get louder with the rattle (time, gain, pitch)
//   puff / laugh / cape - the flash, the vampire's laugh (silent until 0.5 s in the file), the cape swoop
const KNOCKS = [[1.3, 0.35, 0.95], [2.2, 0.4, 1.05], [2.9, 0.5, 0.92], [3.4, 0.55, 1.1], [3.8, 0.65, 1.0],
  [4.1, 0.75, 1.08], [4.35, 0.85, 0.94], [4.55, 0.9, 1.12], [4.7, 1.0, 1.0]];
const CUES = [
  { t: 0, sound: 'whoosh', gain: 0.8 },
  { t: STORY.drop, sound: 'scratch', offset: 0.5, duration: 3.9, gain: 3.5, fadeIn: 0.25, fadeOut: 0.4 },
  { t: STORY.drop, sound: 'drone', offset: 0.5, duration: 5.5, gain: 0.55, fadeIn: 0.8, fadeOut: 1.2 },
  ...KNOCKS.map(([t, gain, rate]) => ({ t, sound: 'knock', gain, rate })),
  { t: STORY.emergeAt, sound: 'puff', gain: 0.9 },
  { t: STORY.emergeAt + 0.05, sound: 'laugh', offset: 0.55, duration: 2.2, gain: 0.6, fadeOut: 0.4 },
  { t: STORY.emergeAt + 0.1, sound: 'cape', offset: 2.9, duration: 1.3, gain: 0.7, fadeIn: 0.05, fadeOut: 0.3 },
].sort((a, b) => a.t - b.t);

const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (v) => Math.min(1, Math.max(0, v));

export function createCoffinStory({ stage, el, state, setMode, audio, speech,
  stageWidthPx, groundBottom, boxHeight, holdY, gravity }) {
  // Shrink around the raised fist so the whole figure converges inside the coffin.
  const liftInCoffin = groundBottom - (COFFIN.hideFistY - holdY * boxHeight() + boxHeight());
  let current = newStory();
  function newStory() {
    return { phase: null, clock: 0, started: false, done: false,
      from: { x: 0, lift: 0 }, leapTime: 0, nextCue: 0 };
  }
  function setStoryPhase(phase) {
    current.phase = phase;
    el.dataset.phase = phase || '';
    stage.dataset.story = phase === 'done' ? 'done' : phase ? 'playing' : '';
    stage.classList.toggle('story-spent', phase !== null);
  }

  // ---------- Story 1 effect layers ----------
  const coffinCopy = document.getElementById('coffin-dup');
  const glow = document.querySelector('.coffin-glow');
  const puffs = [...document.querySelectorAll('.coffin-fx .puff')];
  const flash = document.querySelector('.coffin-flash');

  // ---------- Story 1 ----------
  function startStory() {
    const story = current;
    story.started = true;
    story.clock = 0;
    story.from = { x: state.x, lift: state.lift };
    setStoryPhase('enter');
    setMode('enter');
  }

  function startLeap() {
    // The vampire bursts out of the coffin: swap form, then leap up and over to the right.
    el.classList.add('is-vamp');
    state.x = COFFIN.hideX;
    state.lift = liftInCoffin;
    state.opacity = 1;
    state.facing = 1;
    state.vy = -STORY.leap;
    // Time in the air until it lands, so it lands exactly on exitX.
    const airTime = (STORY.leap + Math.sqrt(STORY.leap ** 2 + 2 * gravity * liftInCoffin)) / gravity;
    state.vx = (COFFIN.exitX - COFFIN.hideX) / airTime;
    current.leapTime = 0;
    setStoryPhase('emerge');
    setMode('fall');
  }

  function updateStory(dt) {
    const story = current;
    if (!story.started) return;
    if (story.clock < STORY.emergeAt + STORY.tail) story.clock += dt;   // effects keep timing after the leap

    // Fire sound cues as the story clock passes them. The clock only runs while playing, and pausing
    // suspends the audio context, so sound and picture stay together.
    while (story.nextCue < CUES.length && story.clock >= CUES[story.nextCue].t) {
      const { t, sound, ...settings } = CUES[story.nextCue];
      if (audio) audio.play(sound, settings);
      story.nextCue += 1;
    }

    if (state.mode === 'enter') {
      const p = clamp01(story.clock / STORY.drop);
      const eased = 1 - (1 - p) ** 2;                       // slows into the coffin
      state.x = lerp(story.from.x, COFFIN.hideX, eased);
      state.lift = lerp(story.from.lift, liftInCoffin, p * p);   // speeds up like a drop
      state.scale = lerp(1, STORY.hiddenScale, p);
      state.opacity = p < 0.45 ? 1 : 1 - (p - 0.45) / 0.55; // shrinks and fades into the coffin, fully gone at the end
      if (p >= 1) { setStoryPhase('rattle'); setMode('inside'); }
    } else if (state.mode === 'inside') {
      state.opacity = 0;
      if (story.clock >= STORY.emergeAt) startLeap();
    }
    if (story.phase === 'emerge') {
      story.leapTime += dt;
      state.scale = lerp(STORY.hiddenScale, 1, clamp01(story.leapTime / STORY.grow));
    }
  }

  // Effects are a pure function of the story clock, so pausing freezes them exactly.
  function renderStory() {
    if (!coffinCopy || !glow || !flash) return;   // a page without the coffin layers just skips the effects
    const story = current;
    const c = story.clock;
    const w = clamp01((c - STORY.drop) / STORY.rattle);          // 0..1 across the rattle
    const px = (units) => (units / 100) * stageWidthPx();
    const rattling = story.started && c >= STORY.drop && c < STORY.emergeAt;

    // The coffin copy appears once the character has gone into the coffin (nothing pops), stays in front
    // while the vampire bursts out, then fades away.
    const fadeStart = STORY.emergeAt + STORY.dupHold;
    coffinCopy.style.opacity = !story.started || c < STORY.drop ? 0
      : c < fadeStart ? 1 : Math.max(0, 1 - (c - fadeStart) / 0.25);
    const amplitude = 0.5 + 1.6 * w;                              // degrees, growing
    coffinCopy.style.rotate = rattling ? `${amplitude * Math.sin(c * 2 * Math.PI * 11)}deg` : '0deg';
    coffinCopy.style.translate = rattling ? `${px(0.2 * amplitude * Math.sin(c * 2 * Math.PI * 17 + 1))}px 0` : '0 0';

    let glowLevel = 0;
    if (story.started && c >= STORY.drop) {
      glowLevel = c < STORY.emergeAt ? 0.15 + 0.85 * w : Math.max(0, 1 - (c - STORY.emergeAt) / 0.9);
    }
    glow.style.opacity = glowLevel * (0.8 + 0.2 * Math.sin(c * 2 * Math.PI * 1.8));

    puffs.forEach((puff, i) => {
      const age = c - (STORY.drop + 0.25 + i * 0.5);
      const life = 1.7;
      if (!story.started || age < 0 || age > life) { puff.style.opacity = 0; return; }
      const q = age / life;
      const side = i % 2 === 0 ? 1 : -1;
      puff.style.opacity = 0.7 * Math.sin(Math.PI * q);
      puff.style.translate = `${px(side * (2 + 6 * q) + (i - 2.5))}px ${px(-(8 + 20 * q))}px`;
      puff.style.scale = `${0.4 + 1.3 * q}`;
    });

    const flashAge = c - STORY.emergeAt;
    flash.style.opacity = !story.started || flashAge < 0 ? 0
      : flashAge < 0.1 ? flashAge / 0.1 : Math.max(0, 1 - (flashAge - 0.1) / 0.6);
  }

  // Restore the original character and re-arm Story 1 (for when all the stories are finished).
  function resetStory() {
    el.classList.remove('is-vamp');
    current = newStory();
    state.scale = 1;
    state.opacity = 1;
    setStoryPhase(null);
    speech.reset();   // the hint starts over with the rest of the cycle
    if (state.mode === 'enter' || state.mode === 'inside') { state.lift = 0; setMode('idle'); }
    renderStory();
  }

  return {
    id: 'coffin',
    hints: COFFIN_HINTS,
    get phase() { return current.phase; },
    get started() { return current.started; },
    get done() { return current.done; },
    get blocksInteraction() { return ['enter', 'rattle', 'emerge'].includes(current.phase); },
    canTrigger(point) {
      const z = COFFIN.zone;
      return !current.started && !current.done && point.x >= z.left && point.x <= z.right
        && point.y >= z.top && point.y <= z.bottom;
    },
    start: startStory,
    update: updateStory,
    render: renderStory,
    reset: resetStory,
    onLand() {
      if (current.phase === 'emerge') setStoryPhase('done');
      current.done = current.done || current.phase === 'done';
    },
  };
}
