// Sound. Everything plays through one Web Audio context, so one switch controls it all:
//   - Browsers only allow sound after a tap, so the context is resumed from the Enter button
//     (main.js calls setPlaying(true) inside that click).
//   - Play/Pause suspends and resumes the whole context, so every sound that is mid-play
//     freezes and continues exactly where it stopped, in step with the story clock.
//   - If a sound fails to load or decode (offline, blocked, unsupported), the scene simply
//     stays silent for that sound; nothing else breaks.
//
// Sounds are CC0 from Freesound; sources and licenses are in research.md and CREDITS.md.

const SOUND_FILES = {
  whoosh: '802472__sadiquecat__whoosh-magic-disappear.wav',
  scratch: '642949__kneeling__coffin3.ogg',
  knock: '275214__csaszi__coffin-wood-box-movement-_csg.wav',
  drone: '249985__werra__eerie-dark-drone-soundscape.wav',
  puff: '714257__qubodup__puff-of-smoke.wav',
  laugh: '659757__lilmati__laughing-vampire-boss-remastered.wav',
  cape: '711122__cultureshock007__large-wings-superhero-cape-foley.mp3',
};
const MASTER_GAIN = 0.8;   // headroom: several sources peak at 0 dBFS on their own

export function createAudio({ base = 'assets/sound/' } = {}) {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  let ctx = null;
  let master = null;
  try {
    ctx = new AudioContextClass();
    master = ctx.createGain();
    master.gain.value = MASTER_GAIN;
    master.connect(ctx.destination);
  } catch (error) {
    ctx = null;   // no Web Audio: every call below becomes a no-op
  }

  const buffers = {};
  const failed = [];
  const ready = !ctx ? Promise.resolve() : Promise.all(Object.entries(SOUND_FILES).map(async ([name, file]) => {
    try {
      const response = await fetch(base + file);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      buffers[name] = await ctx.decodeAudioData(await response.arrayBuffer());
    } catch (error) {
      failed.push(name);
    }
  }));

  // Play part of a sound. offset/duration pick the piece (seconds into the file, seconds of it);
  // gain is the level; fadeIn/fadeOut are seconds; rate nudges pitch and speed.
  function play(name, { offset = 0, duration, gain = 1, fadeIn = 0, fadeOut = 0, rate = 1 } = {}) {
    const buffer = buffers[name];
    if (!ctx || !buffer) return null;
    const piece = Math.min(duration ?? buffer.duration - offset, buffer.duration - offset);
    const seconds = piece / rate;                          // time it actually takes to play
    const now = ctx.currentTime;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = rate;
    const envelope = ctx.createGain();
    envelope.gain.setValueAtTime(fadeIn > 0 ? 0 : gain, now);
    if (fadeIn > 0) envelope.gain.linearRampToValueAtTime(gain, now + fadeIn);
    if (fadeOut > 0) {
      envelope.gain.setValueAtTime(gain, now + Math.max(fadeIn, seconds - fadeOut));
      envelope.gain.linearRampToValueAtTime(0, now + seconds);
    }
    source.connect(envelope).connect(master);
    source.start(now, offset, piece);
    return source;
  }

  // Called by main.js for Enter and for every Play/Pause. Resuming must happen inside the tap.
  function setPlaying(isPlaying) {
    if (!ctx) return;
    (isPlaying ? ctx.resume() : ctx.suspend()).catch(() => {});
  }

  return { play, setPlaying, ready, failed, get state() { return ctx ? ctx.state : 'unavailable'; } };
}
