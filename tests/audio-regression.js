// Real browser decoders and Web Audio, muted so automation cannot play unexpectedly.
import { createAudio } from '../js/audio.js';

const report = [];
const requests = [];
const started = [];
const realFetch = window.fetch.bind(window);
const realStart = AudioBufferSourceNode.prototype.start;
const realConnect = AudioNode.prototype.connect;
const contexts = new Set();
let currentSound;
const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
function check(condition, message) {
  report.push(`${condition ? 'PASS' : 'FAIL'} ${message}`);
  if (!condition) throw new Error(message);
}
function measure(buffer, offset = 0, duration = buffer.duration - offset) {
  let peak = 0, squares = 0, count = 0;
  const first = Math.floor(offset * buffer.sampleRate);
  const end = Math.min(buffer.length, Math.floor((offset + duration) * buffer.sampleRate));
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const samples = buffer.getChannelData(channel);
    for (let i = first; i < end; i++) {
      peak = Math.max(peak, Math.abs(samples[i]));
      squares += samples[i] ** 2;
      count++;
    }
  }
  return { peak: 20 * Math.log10(peak), rms: 10 * Math.log10(squares / count) };
}
window.fetch = (...args) => { requests.push(String(args[0])); return realFetch(...args); };
// Mute the final output too, because ambience starts automatically after Enter.
AudioNode.prototype.connect = function(destination, ...args) {
  if (destination === this.context.destination && this instanceof GainNode) this.gain.value = 0;
  return realConnect.call(this, destination, ...args);
};
AudioBufferSourceNode.prototype.start = function(...args) {
  contexts.add(this.context);
  started.push({ sound: this.loop ? 'ambient' : currentSound, buffer: this.buffer, node: this });
  return realStart.apply(this, args);
};

try {
  const audio = createAudio({ base: '../assets/sound/' });
  await audio.ready;
  check(audio.failed.length === 0, `All fifteen runtime files decode (failed: ${audio.failed.join(', ') || 'none'})`);
  check(requests.length === 15 && !requests.some(path => path.includes('137706__')),
    'Runtime loads the compact carve clip and never requests the 61 MB original');
  check(audio.state === 'suspended', 'Audio remains suspended before Enter');
  check(started.length === 0, 'Loaded background music does not start before Enter');

  await new Promise(resolve => {
    const button = document.createElement('button');
    button.id = 'start-audio';
    button.textContent = 'Run muted audio checks';
    button.onclick = () => { audio.setPlaying(true); button.remove(); resolve(); };
    document.body.append(button);
  });
  // Audio-device startup is asynchronous; allow it to settle before inspecting state.
  for (let i = 0; i < 100 && audio.state !== 'running'; i++) await wait(10);
  check(audio.state === 'running', 'Enter gesture resumes the audio context');
  const music = started.find(item => item.sound === 'ambient')?.node;
  check(Boolean(music?.loop) && started.filter(item => item.sound === 'ambient').length === 1,
    'Enter starts exactly one repeating background music source');
  let musicEnded = false;
  music.onended = () => { musicEnded = true; };
  // Accelerate this muted source to cross its natural end during the test.
  music.playbackRate.value = 20;

  const soundNames = ['whoosh', 'scratch', 'knock', 'drone', 'puff', 'laugh', 'cape',
    'carve', 'squish', 'sparkle', 'working', 'creak', 'candy', 'cheer'];
  for (const sound of soundNames) {
    currentSound = sound;
    const node = audio.play(sound, { gain: 0, duration: 0.02 });
    check(Boolean(node), `${sound}: real source starts from decoded audio`);
  }
  const buffers = Object.fromEntries(started.map(item => [item.sound, item.buffer]));
  const musicStats = measure(buffers.ambient);
  report.push(`MEASURE ambient ${buffers.ambient.duration.toFixed(3)}s, peak ${musicStats.peak.toFixed(1)}, RMS ${musicStats.rms.toFixed(1)} dBFS`);
  report.push(`MEASURE ambient first/last 0.1s RMS ${measure(buffers.ambient, 0, 0.1).rms.toFixed(1)} / ${measure(buffers.ambient, buffers.ambient.duration - 0.1, 0.1).rms.toFixed(1)} dBFS`);
  const excerpts = [
    ['carve', 0, 0.7], ['squish', 0, 0.534], ['sparkle', 0, 1.271],
    ['working', 0, 2.5], ['knock', 0.24, 0.2], ['creak', 0, 0.6],
    ['candy', 0.75, 0.35], ['cheer', 0, 0.464],
  ];
  for (const [sound, offset, duration] of excerpts) {
    const buffer = buffers[sound];
    const stats = measure(buffer, offset, duration);
    check(buffer.duration + 0.002 >= offset + duration && stats.peak > -45 && stats.rms > -65,
      `${sound}: selected excerpt is in range and contains signal (peak ${stats.peak.toFixed(1)}, RMS ${stats.rms.toFixed(1)} dBFS)`);
  }
  for (const sound of ['knock', 'creak', 'candy', 'cheer', 'working']) {
    const buffer = buffers[sound];
    const bins = [];
    const bin = sound === 'knock' ? 0.05 : 0.25;
    for (let offset = 0; offset < Math.min(buffer.duration, 3); offset += bin) {
      bins.push(`${offset.toFixed(2)}:${measure(buffer, offset, Math.min(bin, buffer.duration - offset)).rms.toFixed(1)}`);
    }
    report.push(`MEASURE ${sound} ${bin}s RMS dBFS ${bins.join(' ')}`);
  }

  // Keep one sound alive across the suspension, rather than merely testing new starts.
  currentSound = 'working';
  const longSound = audio.play('working', { gain: 0, duration: 2.5, fadeIn: 0.04, fadeOut: 0.2 });
  let ended = false;
  longSound.onended = () => { ended = true; };
  const context = longSound.context;
  audio.setPlaying(false);
  for (let i = 0; i < 50 && audio.state !== 'suspended'; i++) await wait(10);
  check(audio.state === 'suspended', 'Pause suspends the real audio context');
  const frozenTime = context.currentTime;
  await wait(200);
  check(context.currentTime === frozenTime && !ended && !musicEnded && music.context === context,
    'Music and an in-progress story sound share the frozen audio clock while paused');
  audio.setPlaying(true);
  for (let i = 0; i < 100 && audio.state !== 'running'; i++) await wait(10);
  await wait(100);
  check(audio.state === 'running' && context.currentTime > frozenTime && !ended,
    'Resume continues the existing sound without restarting it');
  await wait(2500);
  check(ended, 'The resumed sound reaches its normal end');
  check(!musicEnded && music.loop && context.currentTime * 20 > music.buffer.duration,
    'Music continues looping past the end of its decoded buffer');
  audio.setPlaying(true);
  audio.setPlaying(true);
  check(started.filter(item => item.sound === 'ambient').length === 1,
    'Resume and repeated Play calls keep the original music source without layering copies');

  // Enter and pause can both happen while the music is still downloading.
  let releaseMusic;
  window.fetch = (url, ...args) => String(url).includes('381531__')
    ? new Promise(resolve => { releaseMusic = () => resolve(realFetch(url, ...args)); })
    : realFetch(url, ...args);
  const delayed = createAudio({ base: '../assets/sound/' });
  delayed.setPlaying(true);
  releaseMusic();
  await delayed.ready;
  check(started.filter(item => item.sound === 'ambient').length === 2,
    'Music starts after a late download when Enter has already started the scene');
  delayed.setPlaying(false);
  const pausedDownload = createAudio({ base: '../assets/sound/' });
  pausedDownload.setPlaying(true);
  pausedDownload.setPlaying(false);
  releaseMusic();
  await pausedDownload.ready;
  check(started.filter(item => item.sound === 'ambient').length === 2,
    'Music finishing a late download stays silent if the scene was paused');
  pausedDownload.setPlaying(true);
  pausedDownload.setPlaying(true);
  check(started.filter(item => item.sound === 'ambient').length === 3,
    'Play after a late download starts exactly one music source for that player');

  // A failed new asset must not prevent the remaining sounds or interaction loading.
  window.fetch = (url, ...args) => /511485__|381531__/.test(String(url))
    ? Promise.resolve(new Response('', { status: 404 })) : realFetch(url, ...args);
  const missing = createAudio({ base: '../assets/sound/' });
  await missing.ready;
  missing.setPlaying(true);
  check(missing.failed.slice().sort().join(',') === 'ambient,sparkle' && missing.play('sparkle') === null,
    'Missing music and a missing effect are recorded without rejecting loading');
  check(started.filter(item => item.sound === 'ambient').length === 3,
    'Missing music does not start a broken loop or affect other players');
  currentSound = 'puff';
  check(Boolean(missing.play('puff', { gain: 0 })), 'Other sounds still decode and play after a file fails');

  const AudioContextClass = window.AudioContext;
  const WebkitAudioContextClass = window.webkitAudioContext;
  try {
    window.AudioContext = window.webkitAudioContext = undefined;
    const unsupported = createAudio();
    await unsupported.ready;
    unsupported.setPlaying(true);
    check(unsupported.state === 'unavailable' && unsupported.play('puff') === null,
      'A browser without Web Audio keeps the scene silent without throwing');
  } finally {
    window.AudioContext = AudioContextClass;
    window.webkitAudioContext = WebkitAudioContextClass;
  }
  document.body.dataset.result = 'pass';
} catch (error) {
  report.push(`ERROR ${error.stack}`);
  document.body.dataset.result = 'fail';
} finally {
  window.fetch = realFetch;
  AudioBufferSourceNode.prototype.start = realStart;
  AudioNode.prototype.connect = realConnect;
  await Promise.all([...contexts].map(context => context.close()));
  document.getElementById('results').textContent = report.join('\n');
}
