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
  carve: 'pumpkin-carve.wav', // compact excerpt; never fetch the 61 MB original
  squish: '445117__breviceps__cartoon-splat.wav',
  sparkle: '511485__mlaudio__cartoon_wink_magic_sparkle.wav',
  working: '856641__qubodup__cartoon-magic-transition.flac',
  creak: '456814__breviceps__creaking-wood.wav',
  candy: '477369__danlucaz__opening-a-candy-wrapper.mp3',
  cheer: '323703__reitanna__funny-yay.wav',
  ambient: '381531__dominictreis__playful-music.mp3',
};
const MASTER_GAIN = 0.8;   // headroom: several sources peak at 0 dBFS on their own
const AMBIENT_GAIN = 0.12; // background level; story cues keep their existing levels

export function createAudio({ base = 'assets/sound/' } = {}) {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  let ctx = null;
  let master = null;
  try {
    ctx = new AudioContextClass();
    master = ctx.createGain();
    master.gain.value = MASTER_GAIN;
    master.connect(ctx.destination);
    // Also start paused in browsers that permit autoplay (including local previews).
    ctx.suspend().catch(() => {});
  } catch (error) {
    ctx = null;   // no Web Audio: every call below becomes a no-op
  }

  const buffers = {};
  const failed = [];
  let playing = false;
  let ambientSource = null;
  const ready = !ctx ? Promise.resolve() : Promise.all(Object.entries(SOUND_FILES).map(async ([name, file]) => {
    try {
      const response = await fetch(base + file);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      buffers[name] = await ctx.decodeAudioData(await response.arrayBuffer());
      if (name === 'ambient') startAmbience();
    } catch (error) {
      failed.push(name);
    }
  }));

  function startAmbience() {
    if (!ctx || !playing || ambientSource || !buffers.ambient) return;
    ambientSource = ctx.createBufferSource();
    ambientSource.buffer = buffers.ambient;
    ambientSource.loop = true;
    const level = ctx.createGain();
    level.gain.setValueAtTime(0, ctx.currentTime);
    level.gain.linearRampToValueAtTime(AMBIENT_GAIN, ctx.currentTime + 1.5);
    ambientSource.connect(level).connect(master);
    // Keep this source alive across pause and story resets. Suspending the shared
    // context freezes its playhead, so resume never layers or restarts the music.
    ambientSource.start();
  }

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
    playing = isPlaying;
    if (!ctx) return;
    (isPlaying ? ctx.resume() : ctx.suspend()).catch(() => {});
    if (isPlaying) startAmbience();
  }

  return { play, setPlaying, ready, failed, get state() { return ctx ? ctx.state : 'unavailable'; } };
}
