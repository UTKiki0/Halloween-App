// The character. States:
//   idle  - stands still for a random time
//   walk  - walks to a random spot (never leaves the screen)
//   held  - hangs from the pointer by its raised fist (mouse, touch or keyboard pointer)
//   fall  - dropped: falls to the ground, bounces a little, then goes back to idle
//
// Pausing: the loop reads the stage's `is-paused` class every frame (the single source of
// truth for Play/Pause and reduced motion). While paused no time advances, so position,
// animation frame and timers all freeze together and resume from the same spot.
//
// Size and sprite geometry live in CSS on `.character` (--char-w, --extent-*, --hold-*), so
// there is one place to change them. Positions here are in "stage units" (percent of stage width).

const FRAME_COUNT = 8;        // frames per strip (assets/art/char-*.png)
const WALK_FPS = 8;
const IDLE_FPS = 5;
const HANG_FPS = 8;           // cape flutter while held or falling
const WALK_BOXES_PER_SECOND = 0.6;   // walk speed in character-widths per second, so stride scales with size
const IDLE_SECONDS = [1.5, 4];       // random pause between walks
const MIN_WALK = 15;          // shortest walk, so it always visibly goes somewhere
const MAX_FRAME_STEP = 0.1;   // seconds; caps big jumps after the tab was in the background

const FOLLOW_RATE = 22;       // how tightly a held character follows the pointer (higher = tighter)
const GRAVITY = 420;          // stage units per second squared
const BOUNCE = 0.3;           // fraction of speed kept after hitting the ground (0 = no bounce)
const BOUNCE_MIN_SPEED = 40;  // slower impacts just land

const random = (min, max) => min + Math.random() * (max - min);

// `scheduleFrame` defaults to requestAnimationFrame; tests pass a timer-based stand-in.
export function startCharacter(stage, hub, scheduleFrame = requestAnimationFrame) {
  const el = document.getElementById('character');
  if (!el) return;

  // Warm the cache so swapping sprite sheets never flashes.
  ['walk', 'idle', 'hang'].forEach((name) => { new Image().src = `assets/art/char-${name}.png`; });

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

  const groundBounds = () => [boxWidth * extentGround, 100 - boxWidth * extentGround];
  const airBounds = () => [boxWidth * extentAirLeft, 100 - boxWidth * extentAirRight];

  const state = {
    mode: 'idle',
    x: 32,                    // box center, % of stage width
    lift: 0,                  // height above the ground, stage units
    vy: 0,                    // fall speed (downward positive)
    target: 32,               // walk destination
    facing: 1,                // 1 = right (the walk sheet faces right), -1 = left
    modeTime: 0,              // seconds in the current mode (drives the animation frame)
    idleLeft: random(...IDLE_SECONDS),
    held: { x: 32, lift: 0 }, // where the pointer wants the character while held
  };

  function setMode(mode) {
    state.mode = mode;
    state.modeTime = 0;
    el.classList.toggle('is-walking', mode === 'walk');
    el.classList.toggle('is-hanging', mode === 'held' || mode === 'fall');
  }

  // ---------- grabbing ----------
  // Turn a pointer point (the fist) into where the box should be.
  function setHeldTarget(point) {
    const [minX, maxX] = airBounds();
    const height = boxHeight();
    const boxTop = point.y - holdY * height;
    state.held.x = Math.min(maxX, Math.max(minX, point.x - holdX * boxWidth));
    state.held.lift = Math.min(groundBottom - height, Math.max(0, groundBottom - (boxTop + height)));
  }

  hub.addGrabbable({
    // Body area: central part of the box. Standing, skip the empty space above the head.
    hitTest(point) {
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
      state.vy = 0;
      setMode('fall');
    },
  });

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
      // Drift sideways if released beyond the walkable range, so landing is always on screen.
      const [minX, maxX] = groundBounds();
      state.x += (Math.min(maxX, Math.max(minX, state.x)) - state.x) * follow;
      state.vy += GRAVITY * dt;
      state.lift -= state.vy * dt;
      if (state.lift <= 0) {
        state.lift = 0;
        if (state.vy > BOUNCE_MIN_SPEED && BOUNCE > 0) {
          state.vy = -state.vy * BOUNCE;          // small bounce
        } else {
          state.vy = 0;
          state.idleLeft = random(...IDLE_SECONDS);
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
    const fps = { walk: WALK_FPS, idle: IDLE_FPS, held: HANG_FPS, fall: HANG_FPS }[state.mode];
    const frame = Math.floor(state.modeTime * fps) % FRAME_COUNT;
    el.style.left = `${state.x}%`;
    // Lift is in stage-width units, so convert to pixels for the vertical translate.
    el.style.translate = `-50% ${-(state.lift / 100) * stageWidthPx()}px`;
    el.style.scale = `${state.facing} 1`;                    // mirror around the head-centered box
    el.style.backgroundPositionX = `${(frame / (FRAME_COUNT - 1)) * 100}%`;
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
}
