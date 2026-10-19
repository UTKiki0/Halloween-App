// Start screen + Play/Pause. One rule drives everything: the `is-paused` class on the
// stage pauses all CSS motion. Later systems (audio, timers, interaction, stories)
// should subscribe to `onPlayStateChange` so one control pauses or resumes them all.

import { createPointerHub } from './pointer.js';
import { startCharacter } from './character.js';

const stage = document.getElementById('stage');
const startScreen = document.getElementById('start');
const enterButton = document.getElementById('enter');
const playPauseButton = document.getElementById('playpause');
const motionNote = document.getElementById('motion-note');

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const playStateListeners = [];
export function onPlayStateChange(listener) {
  playStateListeners.push(listener);
}

// Single place that changes the play state.
function setPlaying(isPlaying) {
  stage.classList.toggle('is-paused', !isPlaying);
  playPauseButton.setAttribute('aria-label', isPlaying ? 'Pause' : 'Play');
  playStateListeners.forEach((listener) => listener(isPlaying));
}

// Honor the device's reduced-motion preference before the experience begins.
if (prefersReducedMotion) motionNote.hidden = false;

enterButton.addEventListener('click', () => {
  startScreen.classList.add('is-hidden');
  playPauseButton.hidden = false;
  setPlaying(!prefersReducedMotion);   // reduced motion: scene starts still
  stage.focus({ preventScroll: true }); // keyboard users land on the scene: arrows move the pointer, Space grabs
  // Later: unlock audio here. Browsers only allow sound after a user gesture like this tap.
});

playPauseButton.addEventListener('click', () => {
  setPlaying(stage.classList.contains('is-paused'));
});

// Both follow the stage's is-paused class, so Play/Pause controls them too.
const pointerHub = createPointerHub(stage);
// Story 1 plays once. When all the stories are finished, call character.resetStory() to turn the
// character back to normal and re-arm it so the cycle can start again.
const character = startCharacter(stage, pointerHub);

enterButton.focus();
