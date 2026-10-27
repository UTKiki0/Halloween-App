// Story 2 owns tap progress and its pickup timeline. All motion uses the character's
// game clock, including the brief feedback between taps and the working smoke.
const ASSETS = [
  'Carving-ready pumpkin at haunted mansion.png',
  'Pumpkin cluster outside a haunted mansion.png',
  "Jack-o'-lantern with seamless green handle.png",
  'Haunted mansion with glowing pumpkins.png',
];
const TAP_SECONDS = 0.8;
const APPROACH_SECONDS = 1.5;
const SMOKE_START = TAP_SECONDS + APPROACH_SECONDS;
const SWAP_AT = SMOKE_START + 1;
const SMOKE_END = SMOKE_START + 2.5; // fade in/out around two seconds of dense smoke
const END_AT = 6;
export const PUMPKIN_HINT = 'I need something to carry my candy';
const clamp = value => Math.min(1, Math.max(0, value));

export function createPumpkinStory({ stage, el, state, hub, setMode, audio, unlocked,
  groundBounds, speech }) {
  const layers = [...stage.querySelectorAll('.pumpkin-stage')];
  const tapGlow = stage.querySelector('.pumpkin-tap');
  const smoke = stage.querySelector('.working-smoke');
  const puffs = [...smoke.querySelectorAll('i')];
  let taps = 0;
  let feedback = 0;
  let queued = 0;
  let clock = 0;
  let started = false;
  let done = false;
  let originX = 0;
  let originLift = 0;
  let swapped = false;
  let press = null;
  let revealSound = false;
  let smokeSound = false;

  ASSETS.forEach(name => { new Image().src = `assets/art/${name}`; });
  const playing = () => started && !done;
  const overPumpkin = point => point.x >= 63 && point.x <= 85 && point.y >= 125 && point.y <= 144;
  function tap() {
    if (!unlocked() || started || stage.classList.contains('is-paused')) return;
    if (feedback > 0) { queued = Math.min(3 - taps, queued + 1); return; }
    taps += 1;
    feedback = TAP_SECONDS;
    if (taps === 1) audio?.play('squish', { gain: 0.5, fadeOut: 0.04 });
    else if (taps === 2) audio?.play('carve', { gain: 0.75 });
    // This source peaks around -25 dBFS, much quieter than the other recordings.
    else audio?.play('sparkle', { gain: 5, fadeOut: 0.12 });
    if (taps === 3) {
      started = true;
      originX = state.x;
      originLift = state.lift;
      state.vx = 0;
      state.vy = 0;
      setMode('pickup');
      speech.reset();
    }
    render();
  }

  // Registered before the character so the character wins when it stands in front.
  hub.addGrabbable({
    hitTest: point => unlocked() && !started && overPumpkin(point),
    onGrab(point) { press = { point, moved: false }; },
    onMove(point) {
      if (press && Math.hypot(point.x - press.point.x, point.y - press.point.y) > 3) press.moved = true;
    },
    onRelease({ cancelled = false } = {}) {
      if (press && !press.moved && !cancelled) tap();
      press = null;
    },
  });

  function update(dt) {
    feedback = Math.max(0, feedback - dt);
    if (!feedback && queued > 0 && !started) { queued -= 1; tap(); }
    if (!playing()) return;
    clock += dt;
    const [minX, maxX] = groundBounds();
    const target = Math.min(maxX, Math.max(minX, 71));
    const travel = clamp((clock - TAP_SECONDS) / APPROACH_SECONDS);
    state.x = originX + (target - originX) * travel;
    state.lift = originLift * (1 - travel);
    state.facing = target >= originX ? 1 : -1;
    el.classList.toggle('is-walking', clock >= TAP_SECONDS && clock < SMOKE_START);
    if (clock >= SMOKE_START && !smokeSound) {
      smokeSound = true;
      audio?.play('working', { gain: 0.35, duration: 2.5, fadeIn: 0.04, fadeOut: 0.2 });
    }
    if (clock >= SWAP_AT && !swapped) {
      swapped = true;
      el.classList.add('has-basket');
    }
    state.opacity = clock >= SMOKE_START + 0.25 && clock < SMOKE_END - 0.25 ? 0 : 1;
    if (clock >= SMOKE_END && !revealSound) {
      revealSound = true;
      audio?.play('puff', { gain: 0.6 });
    }
    if (clock >= END_AT) {
      done = true;
      state.idleLeft = 2;
      state.facing = 1;
      setMode('idle');
    }
  }

  function render() {
    stage.dataset.pumpkin = String(taps);
    stage.dataset.story2 = done ? 'done' : started ? 'playing' : unlocked() ? 'ready' : 'locked';
    layers.forEach((layer, index) => {
      layer.style.opacity = (swapped ? index === 3 : index === taps - 1) ? '1' : '0';
    });
    // Feedback belongs to the tapped pumpkin, while the patch's color grade stays
    // constant. The same game clock freezes the glow and its fade during pause.
    const tapStrength = swapped ? 0 : feedback / TAP_SECONDS;
    tapGlow.style.opacity = String(tapStrength * 0.7);
    tapGlow.style.scale = String(1.05 - tapStrength * 0.15);
    const age = clock - SMOKE_START;
    const envelope = playing() ? Math.min(clamp(age / 0.25), clamp((SMOKE_END - clock) / 0.25)) : 0;
    smoke.style.opacity = String(envelope);
    puffs.forEach((puff, index) => {
      const angle = index * Math.PI * 2 / puffs.length + clock * 3;
      puff.style.transform = `translate(${Math.cos(angle) * 12}%, ${Math.sin(angle) * 10}%) scale(${1 + 0.12 * Math.sin(clock * 9 + index)})`;
    });
    stage.querySelector('.pumpkin-hint').style.opacity = unlocked() && !started ? '1' : '0';
  }

  function reset() {
    taps = feedback = queued = clock = 0;
    started = done = swapped = revealSound = smokeSound = false;
    press = null;
    el.classList.remove('has-basket');
    render();
  }
  return { id: 'pumpkin', hint: PUMPKIN_HINT, update, render, reset,
    get started() { return started; }, get done() { return done; },
    get blocksInteraction() { return playing(); } };
}
