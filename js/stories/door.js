// Story 3 and the exit/return finale share the scene's paused game clock.
export const DOOR_HINT = 'Somebody has their porch light on...';
const PORCH = { x: 54, feet: 131, scale: 0.7 };
const END = { hop: 0.8, knock: 1.7, open: 2.3, offer: 3.1, catch: 3.9,
  receive: 4.3, cheer: 5.4, home: 6.2 };
const KNOCK_TIMES = [0.86, 1.14, 1.42];
const SOUND_CUES = [
  ...KNOCK_TIMES.map(at => ({ at, sound: 'knock', settings: {
    offset: 0.24, duration: 0.2, gain: 0.35, fadeIn: 0.005, fadeOut: 0.04,
  } })),
  { at: END.knock, sound: 'creak', settings: { duration: 0.6, gain: 0.25, fadeOut: 0.08 } },
  { at: 3.75, sound: 'candy', settings: { offset: 0.75, duration: 0.35, gain: 0.7,
    fadeIn: 0.02, fadeOut: 0.06 } },
  { at: 4.575, sound: 'cheer', settings: { gain: 0.4, fadeOut: 0.03 } },
];
const clamp = value => Math.min(1, Math.max(0, value));
const mix = (a, b, t) => a + (b - a) * t;

export function createDoorStory({ stage, el, state, setMode, audio, speech, unlocked,
  groundBottom, walkSpeed, resetEarlierStories }) {
  const door = stage.querySelector('.door-open');
  const hand = stage.querySelector('.door-hand');
  const light = stage.querySelector('.door-light');
  const knock = stage.querySelector('.door-knock');
  const hint = stage.querySelector('.door-hint');
  const porchLift = groundBottom - PORCH.feet;
  const edgeX = 126; // The ENTIRE 48-unit frame is outside before anything resets.
  const finaleSpeed = walkSpeed * 1.5;
  const exitSeconds = (edgeX - 68) / finaleSpeed;
  const returnSeconds = (edgeX - 32) / finaleSpeed;
  let phase = '';
  let clock = 0;
  let from = null;
  let saidLine = false;
  let cycles = 0;
  let handFrame = 0;
  let openAmount = 0;
  let nextCue = 0;

  ['char-vamp-treat.png', 'story3-hand.png', 'Haunted House with an Open Door.png']
    .forEach(name => { new Image().src = `assets/art/${name}`; });

  function canTrigger(point) {
    return !phase && unlocked() && point.x >= 44 && point.x <= 64
      && point.y >= 97 && point.y <= 134;
  }
  function start() {
    from = { x: state.x, lift: state.lift };
    clock = 0;
    nextCue = 0;
    saidLine = false;
    phase = 'approach';
    state.vx = state.vy = 0;
    state.facing = 1;
    setMode('visit');
    speech.reset();
  }
  function update(dt) {
    if (!phase) return;
    clock += dt;
    // Consume crossed cues once, including a frame that crosses multiple beats.
    // The character only updates this clock while the whole scene is playing.
    while (nextCue < SOUND_CUES.length && clock >= SOUND_CUES[nextCue].at) {
      const cue = SOUND_CUES[nextCue++];
      audio?.play(cue.sound, cue.settings);
    }
    handFrame = 0;
    if (phase === 'exit') {
      const p = clamp((clock - END.home) / exitSeconds);
      state.x = mix(68, edgeX, p);
      if (p === 1) {
        // Preserve the off-screen position: costume and scenery reset invisibly.
        resetEarlierStories();
        el.classList.remove('has-candy', 'is-treating');
        cycles += 1;
        phase = 'return';
        state.facing = -1;
      }
      return;
    }
    if (phase === 'return') {
      const p = clamp((clock - END.home - exitSeconds) / returnSeconds);
      state.x = mix(edgeX, 32, p);
      if (p === 1) {
        phase = '';
        state.animationRate = 1;
        state.idleLeft = 2;
        state.facing = 1;
        setMode('idle');
      }
      return;
    }

    state.facing = 1;
    state.frameOverride = 0;
    if (clock < END.hop) {
      const p = clamp(clock / END.hop);
      phase = 'approach';
      state.x = mix(from.x, PORCH.x, p);
      state.lift = mix(from.lift, porchLift, p) + Math.sin(p * Math.PI) * 6;
      state.scale = mix(1, PORCH.scale, p);
      return;
    }
    el.classList.add('is-treating');
    state.x = PORCH.x;
    state.lift = porchLift;
    state.scale = PORCH.scale;
    if (!saidLine) { speech.say('Trick or treat!'); saidLine = true; }
    openAmount = Math.min(clamp((clock - END.knock) / (END.open - END.knock)),
      1 - clamp((clock - 4.8) / (END.cheer - 4.8)));

    if (clock < END.knock) phase = 'knock';
    else if (clock < END.open) phase = 'opening';
    else if (clock < END.offer) {
      phase = 'offer';
      handFrame = clock < 2.7 ? 2 : 3;
    } else if (clock < END.catch) {
      phase = 'candy';
      speech.clear();
      handFrame = 4;
      state.frameOverride = clock < 3.5 ? 1 : 2;
    } else if (clock < END.receive) {
      phase = 'receive';
      handFrame = 5;
      state.frameOverride = 3;
    } else if (clock < END.cheer) {
      phase = 'cheer';
      handFrame = clock < 4.6 ? 6 : 0;
      state.frameOverride = Math.min(7, 4 + Math.floor((clock - END.receive) / 0.275));
      state.lift += Math.sin(clamp((clock - 4.5) / 0.6) * Math.PI) * 2;
    } else if (clock < END.home) {
      phase = 'down';
      const p = clamp((clock - END.cheer) / (END.home - END.cheer));
      state.frameOverride = 7;
      state.x = mix(PORCH.x, 68, p);
      state.lift = mix(porchLift, 0, p) + Math.sin(p * Math.PI) * 4;
      state.scale = mix(PORCH.scale, 1, p);
    } else {
      phase = 'exit';
      speech.clear();
      el.classList.remove('is-treating');
      el.classList.add('has-candy');
      state.frameOverride = null;
      state.lift = 0;
      state.scale = 1;
      state.animationRate = 1.5;
      setMode('finale');
    }
  }

  function render() {
    stage.dataset.story3 = phase || (unlocked() ? 'ready' : 'locked');
    stage.dataset.cycles = String(cycles);
    hint.style.opacity = unlocked() && !phase ? '1' : '0';
    door.style.opacity = String(openAmount);
    light.style.opacity = String(openAmount * 0.5);
    hand.style.opacity = handFrame ? '1' : '0';
    hand.style.backgroundPositionX = `${handFrame / 7 * 100}%`;
    hand.style.translate = `${-3 * (1 - clamp((clock - END.open) / 0.4)) * stage.clientWidth / 100}px 0`;
    const beat = KNOCK_TIMES.reduce((strength, time) => {
      const age = clock - time;
      return Math.max(strength, age >= 0 && age < 0.22 ? 1 - age / 0.22 : 0);
    }, 0);
    knock.style.opacity = phase === 'knock' ? String(beat * 0.75) : '0';
    knock.style.scale = String(1.15 - beat * 0.15);
  }
  function reset() {
    phase = '';
    clock = handFrame = openAmount = 0;
    nextCue = 0;
    saidLine = false;
    state.frameOverride = null;
    state.animationRate = 1;
    el.classList.remove('is-treating', 'has-candy');
    speech.clear();
    render();
  }
  return { id: 'door', hint: DOOR_HINT, canTrigger, start, update, render, reset,
    get blocksInteraction() { return Boolean(phase); },
    get ownsCharacter() { return Boolean(phase); } };
}
