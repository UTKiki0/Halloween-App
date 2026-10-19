// The character. States:
//   idle   - stands still for a random time
//   walk   - walks to a random spot (never leaves the screen)
//   held   - hangs from the pointer by its raised fist (mouse, touch or keyboard pointer)
//   fall   - dropped: falls to the ground, bounces a little, then goes back to idle
//   enter  - Story 1: dropped into the coffin, shrinks and slips behind it
//   inside - Story 1: hidden in the coffin while it rattles and glows
// (Story 1 ends with the character leaping out of the coffin as a vampire, using `fall`.)
//
// Story 1: release the character over the coffin and it turns into the vampire (about 6 seconds).
// It plays once; `resetStory()` (returned by startCharacter) restores the original character and
// re-arms it, for when all stories are done.
//
// Pausing: the loop reads the stage's `is-paused` class every frame (the single source of
// truth for Play/Pause and reduced motion). While paused no time advances, so position,
// animation frame, story clock and effects all freeze together and resume from the same spot.
//
// Size and sprite geometry live in CSS on `.character` (--char-w, --extent-*, --hold-*), so
// there is one place to change them. Positions here are in "stage units" (percent of stage width).

const FRAME_COUNT = 8;        // frames per strip (assets/art/char-*.png)
const WALK_FPS = 8;
const IDLE_FPS = 5;
const HANG_FPS = 8;           // cape flutter while held, falling or in Story 1
const WALK_BOXES_PER_SECOND = 0.6;   // walk speed in character-widths per second, so stride scales with size
const IDLE_SECONDS = [1.5, 4];       // random pause between walks
const MIN_WALK = 15;          // shortest walk, so it always visibly goes somewhere
const MAX_FRAME_STEP = 0.1;   // seconds; caps big jumps after the tab was in the background

const FOLLOW_RATE = 22;       // how tightly a held character follows the pointer (higher = tighter)
const GRAVITY = 420;          // stage units per second squared
const BOUNCE = 0.3;           // fraction of speed kept after hitting the ground (0 = no bounce)
const BOUNCE_MIN_SPEED = 40;  // slower impacts just land

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

const random = (min, max) => min + Math.random() * (max - min);
const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (v) => Math.min(1, Math.max(0, v));

// `scheduleFrame` defaults to requestAnimationFrame; tests pass a timer-based stand-in.
export function startCharacter(stage, hub, scheduleFrame = requestAnimationFrame) {
  const el = document.getElementById('character');
  if (!el) return null;

  // Warm the cache so swapping sprite sheets never flashes.
  ['walk', 'idle', 'hang', 'vamp-walk', 'vamp-idle', 'vamp-hang'].forEach((name) => { new Image().src = `assets/art/char-${name}.png`; });

  // ---------- geometry (from CSS and the live layout) ----------
  const css = getComputedStyle(el);
  const cssNumber = (name) => parseFloat(css.getPropertyValue(name));
  const boxWidth = cssNumber('--char-w');                  // frame box width, % of stage width
  const extentGround = cssNumber('--extent-ground');       // visible half-width as a fraction of the box, walking/idle
  const extentAirLeft = cssNumber('--extent-air-left');    // ... while hanging: reach left of the head center
  const extentAirRight = cssNumber('--extent-air-right');  // ... and right of it (the arm and cape trail left)
  const holdX = cssNumber('--hold-x');                     // fist position: fraction of box width from center
  const holdY = cssNumber('--hold-y');                     // ... and fraction of box height from the top
  const walkSpeed = boxWidth * WALK_BOXES_PER_SECOND;

  const stageWidthPx = () => stage.clientWidth;
  const boxHeight = () => (el.getBoundingClientRect().height / stageWidthPx()) * 100;
  // Where the box bottom sits when standing (measured once, with no lift applied).
  const groundBottom = ((el.getBoundingClientRect().bottom - stage.getBoundingClientRect().top) / stageWidthPx()) * 100;
  // Box lift that puts the raised fist at COFFIN.hideFistY (the box top is holdY of the box height above the fist).
  const liftInCoffin = groundBottom - (COFFIN.hideFistY - holdY * boxHeight() + boxHeight());
  // While going into or coming out of the coffin the figure scales around its fist, not its feet.
  const fistOrigin = `${(0.5 + holdX) * 100}% ${holdY * 100}%`;

  const groundBounds = () => [boxWidth * extentGround, 100 - boxWidth * extentGround];
  const airBounds = () => [boxWidth * extentAirLeft, 100 - boxWidth * extentAirRight];

  // ---------- Story 1 effect layers ----------
  const coffinCopy = document.getElementById('coffin-dup');
  const glow = document.querySelector('.coffin-glow');
  const puffs = [...document.querySelectorAll('.coffin-fx .puff')];
  const flash = document.querySelector('.coffin-flash');

  const state = {
    mode: 'idle',
    x: 32,                    // box center, % of stage width
    lift: 0,                  // height above the ground, stage units
    vy: 0,                    // fall speed (downward positive)
    vx: 0,                    // sideways speed while airborne (the leap out of the coffin)
    scale: 1,                 // 1 normally; shrinks while going into the coffin
    opacity: 1,
    target: 32,               // walk destination
    facing: 1,                // 1 = right (the walk sheets face right), -1 = left
    modeTime: 0,              // seconds in the current mode (drives the animation frame)
    idleLeft: random(...IDLE_SECONDS),
    held: { x: 32, lift: 0 }, // where the pointer wants the character while held
    lastPoint: { x: 0, y: 0 },// last pointer position while held (decides whether the drop was over the coffin)
    story: { phase: null, clock: 0, started: false, done: false, from: { x: 0, lift: 0 }, leapTime: 0 },
  };
  // phase: null (not started) | 'enter' | 'rattle' | 'emerge' | 'done'

  function setMode(mode) {
    state.mode = mode;
    state.modeTime = 0;
    el.classList.toggle('is-walking', mode === 'walk');
    el.classList.toggle('is-hanging', mode === 'held' || mode === 'fall' || mode === 'enter' || mode === 'inside');
  }

  const storyBlocksGrab = () => ['enter', 'rattle', 'emerge'].includes(state.story.phase);
  function setStoryPhase(phase) {
    state.story.phase = phase;
    el.dataset.phase = phase || '';
    stage.dataset.story = phase === 'done' ? 'done' : phase ? 'playing' : '';
  }

  // ---------- grabbing ----------
  // Turn a pointer point (the fist) into where the box should be.
  function setHeldTarget(point) {
    state.lastPoint = point;
    const [minX, maxX] = airBounds();
    const height = boxHeight();
    const boxTop = point.y - holdY * height;
    state.held.x = Math.min(maxX, Math.max(minX, point.x - holdX * boxWidth));
    state.held.lift = Math.min(groundBottom - height, Math.max(0, groundBottom - (boxTop + height)));
  }

  const overCoffin = (p) => p.x >= COFFIN.zone.left && p.x <= COFFIN.zone.right
    && p.y >= COFFIN.zone.top && p.y <= COFFIN.zone.bottom;

  hub.addGrabbable({
    // Body area: central part of the box. Standing, skip the empty space above the head.
    hitTest(point) {
      if (storyBlocksGrab() || state.mode === 'enter' || state.mode === 'inside') return false;
      const r = el.getBoundingClientRect();
      const s = stage.getBoundingClientRect();
      const left = ((r.left - s.left) / s.width) * 100;
      const top = ((r.top - s.top) / s.width) * 100;
      const width = (r.width / s.width) * 100;
      const height = (r.height / s.width) * 100;
      const inAir = state.mode === 'held' || state.mode === 'fall' || state.lift > 0;
      const topFraction = inAir ? 0.04 : 0.25;
      return Math.abs(point.x - (left + width / 2)) <= 0.2 * width
        && point.y >= top + topFraction * height && point.y <= top + height;
    },
    onGrab(point) {
      state.facing = 1;
      setHeldTarget(point);
      setMode('held');
    },
    onMove: setHeldTarget,
    onRelease() {
      if (!state.story.done && !state.story.started && overCoffin(state.lastPoint)) {
        startStory();
      } else {
        state.vy = 0;
        state.vx = 0;
        setMode('fall');
      }
    },
  });

  // ---------- Story 1 ----------
  function startStory() {
    const story = state.story;
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
    const airTime = (STORY.leap + Math.sqrt(STORY.leap ** 2 + 2 * GRAVITY * liftInCoffin)) / GRAVITY;
    state.vx = (COFFIN.exitX - COFFIN.hideX) / airTime;
    state.story.leapTime = 0;
    setStoryPhase('emerge');
    setMode('fall');
  }

  function updateStory(dt) {
    const story = state.story;
    if (!story.started) return;
    if (story.clock < STORY.emergeAt + STORY.tail) story.clock += dt;   // effects keep timing after the leap

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
    const story = state.story;
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
    state.story = { phase: null, clock: 0, started: false, done: false, from: { x: 0, lift: 0 }, leapTime: 0 };
    state.scale = 1;
    state.opacity = 1;
    setStoryPhase(null);
    if (state.mode === 'enter' || state.mode === 'inside') { state.lift = 0; setMode('idle'); }
    renderStory();
  }

  // ---------- behavior ----------
  function chooseTarget() {
    const [minX, maxX] = groundBounds();
    for (let i = 0; i < 20; i += 1) {
      const candidate = random(minX, maxX);
      if (Math.abs(candidate - state.x) >= MIN_WALK) return candidate;
    }
    return state.x < 50 ? maxX : minX;   // fallback: walk to the far side
  }

  function update(dt) {
    state.modeTime += dt;
    const follow = 1 - Math.exp(-FOLLOW_RATE * dt);
    updateStory(dt);

    if (state.mode === 'idle') {
      state.idleLeft -= dt;
      if (state.idleLeft <= 0) {
        state.target = chooseTarget();
        state.facing = state.target > state.x ? 1 : -1;
        setMode('walk');
      }
    } else if (state.mode === 'walk') {
      const step = walkSpeed * dt;
      const remaining = state.target - state.x;
      if (Math.abs(remaining) <= step) {
        state.x = state.target;
        state.idleLeft = random(...IDLE_SECONDS);
        setMode('idle');
      } else {
        state.x += Math.sign(remaining) * step;
      }
    } else if (state.mode === 'held') {
      state.x += (state.held.x - state.x) * follow;
      state.lift += (state.held.lift - state.lift) * follow;
    } else if (state.mode === 'fall') {
      if (state.vx) {
        state.x += state.vx * dt;                            // the leap out of the coffin
      } else {
        // Drift sideways if released beyond the walkable range, so landing is always on screen.
        const [minX, maxX] = groundBounds();
        state.x += (Math.min(maxX, Math.max(minX, state.x)) - state.x) * follow;
      }
      state.vy += GRAVITY * dt;
      state.lift -= state.vy * dt;
      if (state.lift <= 0) {
        state.lift = 0;
        if (state.vy > BOUNCE_MIN_SPEED && BOUNCE > 0) {
          state.vy = -state.vy * BOUNCE;          // small bounce
          state.vx = 0;
        } else {
          state.vy = 0;
          state.vx = 0;
          state.scale = 1;
          state.idleLeft = random(...IDLE_SECONDS);
          if (state.story.phase === 'emerge') setStoryPhase('done');   // Story 1 is over
          state.story.done = state.story.done || state.story.phase === 'done';
          setMode('idle');
        }
      }
    }
    if (state.mode === 'idle' || state.mode === 'walk') {
      const [minX, maxX] = groundBounds();
      state.x = Math.min(maxX, Math.max(minX, state.x));
    }
  }

  function render() {
    const fps = { walk: WALK_FPS, idle: IDLE_FPS, held: HANG_FPS, fall: HANG_FPS, enter: HANG_FPS, inside: HANG_FPS }[state.mode];
    const frame = Math.floor(state.modeTime * fps) % FRAME_COUNT;
    el.style.left = `${state.x}%`;
    // Lift is in stage-width units, so convert to pixels for the vertical translate.
    el.style.translate = `-50% ${-(state.lift / 100) * stageWidthPx()}px`;
    // Mirror around the head-centered box. Shrinking is around the feet normally (CSS default origin: bottom
    // center) and around the fist while in or leaving the coffin.
    const aroundFist = state.mode === 'enter' || state.mode === 'inside' || (state.story.phase === 'emerge' && state.scale < 1);
    el.style.transformOrigin = aroundFist ? fistOrigin : '';
    el.style.scale = `${state.facing * state.scale} ${state.scale}`;
    el.style.opacity = state.opacity;
    el.style.backgroundPositionX = `${(frame / (FRAME_COUNT - 1)) * 100}%`;
    renderStory();
  }

  let last = performance.now();
  function loop(now) {
    const dt = Math.min((now - last) / 1000, MAX_FRAME_STEP);
    last = now;
    if (!stage.classList.contains('is-paused')) update(dt);
    render();
    scheduleFrame(loop);
  }
  scheduleFrame(loop);

  return { resetStory };
}
