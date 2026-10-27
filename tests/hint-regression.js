// Drive the real speech system on a deterministic clock, using each story's real lines.
import { createSpeech } from '../js/speech.js';
import { COFFIN_HINTS } from '../js/stories/coffin.js';
import { PUMPKIN_HINTS } from '../js/stories/pumpkin.js';
import { DOOR_HINTS } from '../js/stories/door.js';

const report = [];
function check(condition, message) {
  report.push(`${condition ? 'PASS' : 'FAIL'} ${message}`);
  if (!condition) throw new Error(message);
}
try {
  const markup = await (await fetch('../index.html')).text();
  const stage = new DOMParser().parseFromString(markup, 'text/html').getElementById('stage');
  stage.querySelectorAll('img').forEach(img => {
    img.src = new URL(img.getAttribute('src'), new URL('../index.html', location.href)).href;
  });
  document.body.append(stage);
  const speech = createSpeech(stage, COFFIN_HINTS);
  const root = stage.querySelector('#speech');
  const bubble = root.querySelector('.speech-bubble');
  const text = () => root.querySelector('.speech-text').textContent;
  const visible = () => root.classList.contains('is-visible');
  const advance = (seconds, allowed = true) => {
    for (let i = 0; i < Math.round(seconds * 60); i++) speech.update(1 / 60, allowed);
  };
  const cases = [
    ['Coffin', COFFIN_HINTS, 'Drag me onto the coffin and let go!'],
    ['Pumpkin', PUMPKIN_HINTS, 'Tap the big pumpkin until it turns into my basket!'],
    ['Door', DOOR_HINTS, 'Drag me onto the house door and let go!'],
  ];
  for (const [name, lines, instruction] of cases) {
    speech.setHints(lines);
    check(!visible() && text() === '', `${name}: switching stories hides the previous hint`);
    advance(5.9);
    check(!visible(), `${name}: no hint before six available seconds`);
    advance(0.2);
    check(visible() && text() === lines[0], `${name}: subtle hint at six seconds`);
    check(stage.querySelector('#speech-live').textContent === text(), `${name}: live region announces the displayed hint`);
    advance(4.2);
    check(visible(), `${name}: bubble remains readable for its full display time`);
    advance(0.4);
    check(!visible(), `${name}: bubble clears after about 4.5 seconds`);
    advance(14.2);
    check(!visible(), `${name}: clearer hint does not appear before 25 seconds`);
    advance(0.2);
    check(text() === lines[1], `${name}: clearer hint at 25 seconds`);
    advance(19.8);
    check(!visible(), `${name}: instruction does not appear before 45 seconds`);
    advance(0.2);
    check(visible() && text() === instruction, `${name}: direct instruction at 45 seconds`);
    advance(24.8);
    check(!visible(), `${name}: final instruction waits 25 seconds before repeating`);
    advance(0.3);
    check(text() === instruction, `${name}: final instruction repeats at about 70 seconds`);
    advance(25);
    check(text() === instruction, `${name}: repeated instruction never cycles back to vague hints`);

    // Longer copy must fit at both horizontal extremes, at every supported phone size.
    for (let index = 0; index < lines.length; index++) {
      speech.setHints(lines);
      advance([6.1, 25.1, 45.1][index]);
      check(text() === lines[index], `${name}: level ${index + 1} uses the approved story text`);
      for (const x of [0, 100]) {
        speech.render(x, 120);
        const bounds = bubble.getBoundingClientRect();
        const scene = stage.getBoundingClientRect();
        check(bounds.left >= scene.left + 1 && bounds.right <= scene.right - 1
          && bounds.top >= scene.top && bounds.bottom <= scene.bottom,
        `${name}: level ${index + 1} stays inside the scene near ${x === 0 ? 'left' : 'right'} edge`);
      }
    }
  }

  speech.setHints(COFFIN_HINTS);
  advance(5);
  advance(60, false);
  check(!visible(), 'Holding the character does not advance a pending hint');
  advance(1.1);
  check(text() === COFFIN_HINTS[0], 'Releasing resumes the saved hint clock');
  advance(60, false);
  check(!visible() && text() === '', 'Grabbing hides a visible bubble immediately');
  advance(3.9);
  check(!visible(), 'Interrupted hint waits four available seconds before retry');
  advance(0.2);
  check(text() === COFFIN_HINTS[0], 'An interrupted line retries without skipping a hint level');
  advance(4.6);
  advance(10.3);
  check(text() === COFFIN_HINTS[1], 'Escalation continues after the retried hint completes');

  speech.setHints(DOOR_HINTS);
  speech.say('Trick or treat!');
  advance(100, false);
  check(text() === 'Trick or treat!', 'Scripted story speech stays separate from hint progression');
  speech.clear();
  advance(5.9);
  check(!visible(), 'Scripted speech does not consume the next hint countdown');
  advance(0.2);
  check(text() === DOOR_HINTS[0], 'Hints resume from their own clock after scripted speech clears');
  advance(39);
  check(text() === DOOR_HINTS[2], 'Reset scenario first reaches the final instruction');
  speech.reset();
  advance(5.9);
  check(!visible(), 'Reset clears speech and restarts the six-second delay');
  advance(0.2);
  check(text() === DOOR_HINTS[0], 'Reset returns to the first hint instead of keeping the final instruction');
  document.body.dataset.result = 'pass';
} catch (error) {
  report.push(`ERROR ${error.stack}`);
  document.body.dataset.result = 'fail';
}
document.getElementById('stage')?.remove();
document.getElementById('results').textContent = report.join('\n');
