// Run with a browser over HTTP. Optional ?baseline=<module URL> compares an equivalent
// implementation's deterministic trace, including every sound cue.
import { startCharacter } from '../js/character.js';
import { createPointerHub } from '../js/pointer.js';

const results = document.getElementById('results');
const report = [];
const preview = new URLSearchParams(location.search).get('preview');
function check(condition, message) {
  report.push(`${condition ? 'PASS' : 'FAIL'} ${message}`);
  if (!condition) throw new Error(message);
}

try {
  const markup = await (await fetch('../index.html')).text();
  const template = new DOMParser().parseFromString(markup, 'text/html').getElementById('stage');
  // The fixture lives in tests/, while the app's image URLs are relative to its root.
  template.querySelectorAll('img').forEach(img => {
    img.src = new URL(img.getAttribute('src'), new URL('../index.html', location.href)).href;
  });

  function run(start) {
    document.getElementById('stage')?.remove();
    const stage = template.cloneNode(true);
    document.body.append(stage);
    const el = stage.querySelector('#character');
    let clock = 0;
    let activeClock = 0;
    let seed = 12345;
    let nextFrame;
    let pointerFrame;
    let target;
    const targets = [];
    const cues = [];
    const trace = [];
    Object.defineProperty(performance, 'now', { configurable: true, value: () => clock });
    Math.random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const realHub = createPointerHub(stage, callback => { pointerFrame = callback; });
    const character = start(stage, { addGrabbable(g) {
      targets.push(g); target = g; realHub.addGrabbable(g);
    } }, {
      scheduleFrame(callback) { nextFrame = callback; },
      audio: { play(sound, settings) { cues.push({ sound, settings, at: activeClock }); } },
    });
    function snapshot() {
      return {
        actor: el.getAttribute('style'), classes: el.className, phase: el.dataset.phase,
        story: stage.dataset.story, spent: stage.classList.contains('story-spent'),
        effects: [...stage.querySelectorAll('.coffin-dup, .coffin-glow, .puff, .coffin-flash')]
          .map(node => node.getAttribute('style')),
        speech: stage.querySelector('#speech').outerHTML,
        live: stage.querySelector('#speech-live').textContent,
        cues: JSON.stringify(cues),
      };
    }
    function step(seconds) {
      for (let i = 0; i < Math.round(seconds * 60); i++) {
        clock += 1000 / 60;
        if (!stage.classList.contains('is-paused')) activeClock += 1 / 60;
        pointerFrame(clock);
        nextFrame(clock);
        trace.push(snapshot());
      }
    }
    function drop(point) {
      target.onGrab(point);
      step(0.2);
      target.onMove(point);
      target.onRelease();
    }
    function waitForHint(message) {
      for (let i = 0; i < 6000; i++) {
        if (stage.querySelector('#speech').classList.contains('is-visible')
          && stage.querySelector('.speech-text').textContent === message) return;
        step(1 / 60);
      }
      throw new Error(`Hint did not appear: ${message}`);
    }
    step(1);
    check(!el.classList.contains('is-vamp') && cues.length === 0, 'No story before Enter');
    const pumpkin = targets.length > 1 ? targets[0] : null;
    if (pumpkin) check(!pumpkin.hitTest({ x: 74, y: 134 }), 'Pumpkin locked before Story 1');
    stage.classList.remove('is-paused');
    step(7);
    check(stage.querySelector('.speech-text').textContent === 'I really want a vampire outfit for Halloween.',
      'Original hint appears after six seconds');
    if (preview === 'hint-coffin') { waitForHint('Drag me onto the coffin and let go!'); return trace; }
    drop({ x: 50, y: 80 });
    step(2);
    check(!stage.dataset.story && cues.length === 0, 'Release away from coffin does not trigger story');
    drop({ x: 54, y: 115 });
    step(2);
    check(stage.dataset.story3 === 'locked', 'Door story is locked before the vampire transformation');
    drop({ x: 19, y: 122 });
    step(2);
    check(el.dataset.phase === 'rattle', 'Coffin enters rattle phase');
    check(!target.hitTest({ x: 19, y: 122 }), 'Character locked during story');
    const frozen = JSON.stringify(snapshot());
    stage.classList.add('is-paused');
    step(2);
    check(JSON.stringify(snapshot()) === frozen, 'Pause freezes character, effects, speech and sound cues');
    stage.classList.remove('is-paused');
    step(6);
    check(stage.dataset.story === 'done' && el.classList.contains('is-vamp'), 'Story ends as vampire');
    check(cues.length === 15, 'All fifteen Story 1 cues fire once');
    check(el.style.opacity === '1' && el.style.scale.split(' ').every(value => Math.abs(Number(value)) === 1),
      'Vampire restores full opacity and scale');
    check(stage.querySelector('#speech-live').textContent === '', 'Hint stops after story starts');
    drop({ x: 19, y: 122 });
    step(2);
    check(cues.length === 15, 'Second coffin drop does not replay story');
    character.resetStory();
    check(!el.classList.contains('is-vamp') && !stage.classList.contains('story-spent'), 'Reset restores hero and hint');
    drop({ x: 19, y: 122 });
    step(8);
    check(cues.length === 30 && stage.dataset.story === 'done', 'Reset allows a complete replay');
    if (pumpkin) {
      check(pumpkin.hitTest({ x: 74, y: 134 }), 'Pumpkin unlocks after Story 1');
      if (preview === 'hint-pumpkin') {
        waitForHint('Tap the big pumpkin until it turns into my basket!'); return trace;
      }
      if (preview === 'base') {
        stage.querySelector('.pumpkin-hint').style.opacity = '0';
        return trace;
      }
      function tapPumpkin() {
        pumpkin.onGrab({ x: 74, y: 134 });
        pumpkin.onRelease();
      }
      pumpkin.onGrab({ x: 74, y: 134 });
      pumpkin.onRelease({ cancelled: true });
      check(stage.dataset.pumpkin === '0', 'Cancelled press does not carve pumpkin');
      pumpkin.onGrab({ x: 74, y: 134 });
      pumpkin.onMove({ x: 90, y: 134 });
      pumpkin.onRelease();
      check(stage.dataset.pumpkin === '0', 'Drag does not count as pumpkin tap');
      function pointer(type, pointerType = 'mouse') {
        const r = stage.getBoundingClientRect();
        stage.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerId: 1, pointerType,
          button: 0, clientX: r.left + r.width * 0.74, clientY: r.top + r.width * 1.34 }));
      }
      pointer('pointerdown');
      stage.classList.add('is-paused');
      step(0.1);
      pointer('pointerup');
      check(stage.dataset.pumpkin === '0', 'Pausing a real pointer press cancels the tap');
      stage.classList.remove('is-paused');
      pointer('pointerdown', 'touch'); pointer('pointercancel', 'touch');
      check(stage.dataset.pumpkin === '0', 'Touch cancellation does not count as a tap');
      pointer('pointerdown'); pointer('pointerup');
      check(stage.dataset.pumpkin === '1', 'First tap reveals hollow pumpkin');
      if (preview === 'tap') return trace;
      const tapGlow = stage.querySelector('.pumpkin-tap');
      const hollowLayer = stage.querySelector('.pumpkin-hollow');
      const steadyColor = getComputedStyle(hollowLayer).filter;
      check(Number(tapGlow.style.opacity) > 0, 'Tap produces feedback around the pumpkin');
      stage.classList.add('is-paused');
      const frozenFeedback = tapGlow.style.cssText;
      step(1);
      check(tapGlow.style.cssText === frozenFeedback, 'Pause freezes tap feedback');
      stage.classList.remove('is-paused');
      step(5);
      check(stage.dataset.pumpkin === '1', 'Pumpkin progress persists while waiting');
      check(tapGlow.style.opacity === '0', 'Tap feedback clears without brightening the patch');
      check(getComputedStyle(hollowLayer).filter === steadyColor, 'Patch color stays constant during and after a tap');
      if (preview === 'hollow') return trace;
      stage.focus();
      function key(type, key) { stage.dispatchEvent(new KeyboardEvent(type, { bubbles: true, key })); }
      const cursor = stage.querySelector('#cursor');
      key('keydown', 'ArrowRight');
      for (let i = 0; i < 100 && parseFloat(cursor.style.left || '50') < 73; i++) step(1 / 60);
      key('keyup', 'ArrowRight');
      key('keydown', 'ArrowDown');
      for (let i = 0; i < 100; i++) {
        step(1 / 60);
        const y = parseFloat(cursor.style.top) / 100 * realHub.stageHeightUnits();
        if (y >= 133) break;
      }
      key('keyup', 'ArrowDown');
      key('keydown', ' '); key('keyup', ' ');
      check(stage.dataset.pumpkin === '2', 'Arrow keys and Space advance pumpkin through real pointer hub');
      if (preview === 'carved') { step(0.9); return trace; }
      tapPumpkin();
      check(stage.dataset.pumpkin === '2', 'Rapid next tap waits for carving feedback');
      step(0.9);
      check(stage.dataset.pumpkin === '3' && stage.dataset.story2 === 'playing', 'Queued third tap starts pickup');
      if (preview === 'lit') { step(0.85); return trace; }
      check(!target.hitTest({ x: 71, y: 155 }), 'Character locked during pumpkin pickup');
      step(2.5);
      check(Number(stage.querySelector('.working-smoke').style.opacity) === 1, 'Working smoke becomes dense');
      if (preview === 'smoke') return trace;
      const frozenPickup = JSON.stringify({ actor: el.style.cssText, smoke: stage.querySelector('.working-smoke').outerHTML,
        overlays: [...stage.querySelectorAll('.pumpkin-stage')].map(node => node.style.cssText), cues: cues.length });
      stage.classList.add('is-paused');
      step(2);
      check(JSON.stringify({ actor: el.style.cssText, smoke: stage.querySelector('.working-smoke').outerHTML,
        overlays: [...stage.querySelectorAll('.pumpkin-stage')].map(node => node.style.cssText), cues: cues.length }) === frozenPickup,
      'Pause freezes pickup, smoke, art swap and cues');
      stage.classList.remove('is-paused');
      step(4);
      check(stage.dataset.story2 === 'done' && el.classList.contains('has-basket'), 'Six-second pickup ends with basket');
      check(stage.querySelectorAll('.pumpkin-stage')[3].style.opacity === '1', 'Removed-pumpkin background revealed');
      check(stage.querySelector('.working-smoke').style.opacity === '0', 'Smoke clears after pickup');
      const pumpkinCues = cues.slice(30);
      check(pumpkinCues.map(cue => cue.sound).join(',') === 'squish,carve,sparkle,working,puff',
        'Story 2 plays each of its five approved cues once, in order');
      check(Math.abs(pumpkinCues[3].at - pumpkinCues[2].at - 2.3) < 0.035
        && Math.abs(pumpkinCues[4].at - pumpkinCues[2].at - 4.8) < 0.035,
        'Working sound and reveal puff follow active story time through pause');
      const r = el.getBoundingClientRect(); const s = stage.getBoundingClientRect();
      check(target.hitTest({ x: (r.left + r.width / 2 - s.left) / s.width * 100,
        y: (r.bottom - r.height * 0.3 - s.top) / s.width * 100 }), 'Character becomes grabbable after pickup');
      check(!pumpkin.hitTest({ x: 74, y: 134 }), 'Completed pumpkin cannot trigger again');
      check(getComputedStyle(el).backgroundImage.includes('char-vamp-basket-idle.png'), 'Basket reveal uses normalized idle strip');
      check(getComputedStyle(el).backgroundSize === '800% 100%', 'Basket form retains the shared strip size');
      if (preview === 'basket') return trace;
      for (let i = 0; i < 600 && !el.classList.contains('is-walking'); i++) step(1 / 60);
      check(el.classList.contains('is-walking')
        && getComputedStyle(el).backgroundImage.includes('char-vamp-basket-walk.png'), 'Wandering uses basket walk animation');
      if (preview === 'walk') return trace;
      const walkFrames = new Set();
      const idleFrames = new Set();
      for (let i = 0; i < 600; i++) {
        step(1 / 60);
        if (el.classList.contains('is-walking')) walkFrames.add(el.style.backgroundPositionX);
        else idleFrames.add(el.style.backgroundPositionX);
      }
      check(walkFrames.size === 8, 'Wandering advances through all eight basket walk frames');
      check(idleFrames.size === 8, 'Standing advances through all eight basket idle frames');
      target.onGrab({ x: 48, y: 95 });
      step(0.5);
      check(getComputedStyle(el).backgroundImage.includes('char-vamp-basket-hang.png'), 'Grabbing uses basket hang animation');
      const heldRect = el.getBoundingClientRect(); const stageRect = stage.getBoundingClientRect();
      const fistX = heldRect.left + heldRect.width * (0.5 + parseFloat(getComputedStyle(el).getPropertyValue('--hold-x')));
      const fistY = heldRect.top + heldRect.height * parseFloat(getComputedStyle(el).getPropertyValue('--hold-y'));
      check(Math.hypot(fistX - stageRect.left - stageRect.width * 0.48,
        fistY - stageRect.top - stageRect.width * 0.95) < 1, 'Basket fist stays within one pixel of pointer hotspot');
      if (preview === 'hang') return trace;
      const hangFrames = new Set();
      for (let i = 0; i < 60; i++) { step(1 / 60); hangFrames.add(el.style.backgroundPositionX); }
      check(hangFrames.size === 8, 'Holding advances through all eight basket hang frames');
      stage.classList.add('is-paused');
      const frozenHang = el.style.cssText;
      step(1);
      check(el.style.cssText === frozenHang, 'Pause freezes basket pose and position');
      stage.classList.remove('is-paused');
      target.onRelease();
      step(0.1);
      check(getComputedStyle(el).backgroundImage.includes('char-vamp-basket-hang.png'), 'Falling retains basket hang pose');
      step(2);
      check(!el.classList.contains('is-hanging') && el.classList.contains('has-basket'), 'Landing returns to basket ground poses');

      check(stage.dataset.story3 === 'ready' && stage.querySelector('.door-hint').style.opacity === '1',
        'Only after basket pickup does the door story and hint unlock');
      if (preview === 'hint-door') { waitForHint('Drag me onto the house door and let go!'); return trace; }
      function pointerAt(type, point) {
        const s = stage.getBoundingClientRect();
        stage.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerId: 9, pointerType: 'touch', button: 0,
          clientX: s.left + point.x / 100 * s.width, clientY: s.top + point.y / 100 * s.width }));
      }
      function bodyPoint() {
        const r = el.getBoundingClientRect(); const s = stage.getBoundingClientRect();
        return { x: (r.left + r.width / 2 - s.left) / s.width * 100,
          y: (r.bottom - r.height * 0.3 - s.top) / s.width * 100 };
      }
      pointerAt('pointerdown', bodyPoint());
      pointerAt('pointermove', { x: 54, y: 115 });
      pointerAt('pointercancel', { x: 54, y: 115 });
      step(2);
      check(stage.dataset.story3 === 'ready', 'Cancelled door drop does not trigger Story 3');
      pointerAt('pointerdown', bodyPoint());
      pointerAt('pointermove', { x: 54, y: 115 });
      step(0.2);
      const story3Start = clock;
      const story3ActiveStart = activeClock;
      const story3Cues = cues.length;
      let pausedStory3 = 0;
      pointerAt('pointerup', { x: 54, y: 115 });
      function reachPhase(expected) {
        for (let i = 0; i < 700 && stage.dataset.story3 !== expected; i++) step(1 / 60);
        check(stage.dataset.story3 === expected, `Story 3 reaches ${expected}`);
      }
      function freezeStory3() {
        stage.classList.add('is-paused');
        const frame = JSON.stringify({ actor: el.outerHTML, effects: [...stage.querySelectorAll('.door-open, .door-hand, .door-light, .door-knock')].map(n => n.style.cssText),
          speech: stage.querySelector('#speech').outerHTML, cues: cues.length });
        step(0.5);
        pausedStory3 += 0.5;
        check(JSON.stringify({ actor: el.outerHTML, effects: [...stage.querySelectorAll('.door-open, .door-hand, .door-light, .door-knock')].map(n => n.style.cssText),
          speech: stage.querySelector('#speech').outerHTML, cues: cues.length }) === frame, `Pause freezes Story 3 ${stage.dataset.story3}`);
        stage.classList.remove('is-paused');
      }
      reachPhase('approach');
      check(!target.hitTest(bodyPoint()), 'Story 3 blocks grabbing immediately');
      freezeStory3();
      reachPhase('knock');
      check(stage.querySelector('#speech-live').textContent === 'Trick or treat!', 'Story 3 speech is visible and announced');
      const doorstepFeet = (el.getBoundingClientRect().bottom - stage.getBoundingClientRect().top) / stage.clientWidth * 100;
      check(Math.abs(doorstepFeet - 131) < 0.2 && el.style.scale.split(' ').every(value => Number(value) === 0.7),
        'Vampire stands on the doorstep at the intended depth');
      if (preview === 'story3-knock') return trace;
      freezeStory3();
      reachPhase('offer');
      check(stage.querySelector('.door-open').style.opacity === '1' && stage.querySelector('.door-hand').style.opacity === '1',
        'The door opens and the skeleton offers candy');
      if (preview === 'story3-offer') { step(0.3); return trace; }
      freezeStory3();
      reachPhase('candy');
      check(getComputedStyle(el).backgroundImage.includes('char-vamp-treat.png'), 'Candy handoff uses the supplied chronological character sheet');
      if (preview === 'story3-candy') { step(0.45); return trace; }
      freezeStory3();
      reachPhase('receive');
      check(Math.abs(parseFloat(el.style.backgroundPositionX) - 3 / 7 * 100) < 0.01, 'Candy reaches the full-basket frame');
      reachPhase('cheer');
      if (preview === 'story3-cheer') { step(0.4); return trace; }
      freezeStory3();
      reachPhase('down');
      check(stage.querySelector('.door-open').style.opacity === '0' && stage.querySelector('.door-hand').style.opacity === '0',
        'Door closes and hand clears before returning to ground');
      reachPhase('exit');
      check(el.classList.contains('is-walking') && el.classList.contains('has-candy') && el.classList.contains('is-vamp'),
        'Vampire walks out carrying the collected candy');
      if (preview === 'story3-exit') { step(0.5); return trace; }
      freezeStory3();
      reachPhase('return');
      check(el.getBoundingClientRect().left >= stage.getBoundingClientRect().right, 'Costume reset happens with the entire character frame off-screen');
      check(!el.classList.contains('is-vamp') && !el.classList.contains('has-basket') && stage.dataset.pumpkin === '0',
        'Original character and pumpkin are restored together off-screen');
      check(!target.hitTest(bodyPoint()), 'Return walk remains locked against grabbing');
      if (preview === 'story3-return') { step(0.8); return trace; }
      freezeStory3();
      reachPhase('locked');
      const wholeSequenceSeconds = (clock - story3Start) / 1000 - pausedStory3;
      check(wholeSequenceSeconds >= 5 && wholeSequenceSeconds <= 10,
        `Story 3 including exit and return lasts 5-10 active seconds (measured ${wholeSequenceSeconds.toFixed(3)}s)`);
      check(stage.dataset.cycles === '1' && el.style.left === '32%' && !stage.classList.contains('story-spent'),
        'Hero walks back to the original position and the coffin hint re-arms once');
      check(target.hitTest(bodyPoint()), 'Interaction resumes after the hero returns');
      const doorCues = cues.slice(story3Cues);
      check(doorCues.map(cue => cue.sound).join(',') === 'knock,knock,knock,creak,candy,cheer',
        'Story 3 plays three knocks, door creak, candy rustle and cheer exactly once');
      check(doorCues.every((cue, index) => Math.abs(cue.at - story3ActiveStart
        - [0.86, 1.14, 1.42, 1.7, 3.75, 4.575][index]) < 0.035),
        'Door sounds align to visual beats on active time, including seven pauses');
      if (preview === 'story3-reset') return trace;

      // Play the whole chain again without a reload, with the keyboard door trigger.
      const replayCues = cues.length;
      drop({ x: 19, y: 122 }); step(8);
      check(stage.dataset.story === 'done', 'Automatic reset permits Story 1 again');
      tapPumpkin(); step(0.9); tapPumpkin(); step(0.9); tapPumpkin();
      function moveKeyboardTo(point) {
        stage.focus();
        for (const axis of ['x', 'y']) {
          for (let i = 0; i < 150; i++) {
            const value = axis === 'x' ? parseFloat(cursor.style.left || '50')
              : parseFloat(cursor.style.top || '62') / 100 * realHub.stageHeightUnits();
            const difference = point[axis] - value;
            if (Math.abs(difference) < 1) break;
            const arrow = axis === 'x' ? (difference > 0 ? 'ArrowRight' : 'ArrowLeft')
              : (difference > 0 ? 'ArrowDown' : 'ArrowUp');
            key('keydown', arrow); step(1 / 60); key('keyup', arrow);
          }
          step(1 / 60);
        }
      }
      moveKeyboardTo({ x: 71, y: 157 });
      step(5.7);
      check(stage.dataset.story2 === 'done', 'Automatic reset permits Story 2 again');
      key('keydown', ' '); step(1 / 60);
      check(el.classList.contains('is-hanging'), 'Keyboard grabs the basket character for Story 3');
      moveKeyboardTo({ x: 54, y: 115 });
      key('keyup', ' ');
      reachPhase('approach');
      check(stage.dataset.cycles === '1', 'Keyboard release over door starts the second Story 3');
      step(10);
      check(stage.dataset.cycles === '2' && !el.classList.contains('is-vamp'), 'A second complete chain resets without reloading');
      check(cues.slice(replayCues).length === 26
        && cues.slice(replayCues + 15, replayCues + 20).map(cue => cue.sound).join(',') === 'squish,carve,sparkle,working,puff'
        && cues.slice(replayCues + 20).map(cue => cue.sound).join(',') === 'knock,knock,knock,creak,candy,cheer',
        'A second chain re-arms every sound once without retaining completed cues');
      character.resetStory();
      check(stage.dataset.pumpkin === '0' && !el.classList.contains('has-basket')
        && stage.querySelector('.working-smoke').style.opacity === '0', 'Reset restores pumpkin, character and smoke');
      check(tapGlow.style.opacity === '0', 'Reset clears pumpkin tap feedback');
      check(!getComputedStyle(el).backgroundImage.includes('basket'), 'Reset restores original hero sprite');

      // Exercise escalation through the real character/story owner as well as the
      // focused speech suite, including unlocking each new set and the full reset.
      waitForHint('Drag me onto the coffin and let go!');
      check(stage.dataset.story3 === 'locked', 'Coffin instruction appears while later stories remain locked');
      stage.classList.add('is-paused');
      const frozenInstruction = stage.querySelector('#speech').outerHTML;
      step(30);
      check(stage.querySelector('#speech').outerHTML === frozenInstruction,
        'A visible final instruction remains frozen throughout a long scene pause');
      stage.classList.remove('is-paused');
      drop({ x: 19, y: 122 }); step(8);
      waitForHint('I need something to carry my candy.');
      check(stage.dataset.story2 === 'ready', 'Story 2 unlocks with its own first hint rather than the previous instruction');
      waitForHint('Tap the big pumpkin until it turns into my basket!');
      check(stage.dataset.pumpkin === '0', 'Unsolved pumpkin escalates to its own direct instruction');
      tapPumpkin(); step(0.9);
      check(stage.querySelector('.speech-text').textContent === 'Tap the big pumpkin until it turns into my basket!',
        'Partial pumpkin progress retains its current hint level');
      tapPumpkin(); step(0.9); tapPumpkin(); step(7);
      waitForHint('Somebody has their porch light on…');
      check(stage.dataset.story3 === 'ready', 'Story 3 unlocks with its own first hint');
      waitForHint('Drag me onto the house door and let go!');
      check(stage.querySelector('#speech-live').textContent === 'Drag me onto the house door and let go!',
        'Door instruction is also announced in the live region');
      drop({ x: 54, y: 115 }); step(10);
      waitForHint('I really want a vampire outfit for Halloween.');
      check(stage.dataset.cycles === '3' && !el.classList.contains('is-vamp'),
        'Automatic exit/return reset starts the new cycle with the subtle coffin hint');
    }
    return trace;
  }

  const current = run(startCharacter);
  const baselineURL = new URLSearchParams(location.search).get('baseline');
  if (baselineURL) {
    const baseline = await import(baselineURL);
    const previous = run(baseline.startCharacter);
    check(JSON.stringify(current) === JSON.stringify(previous),
      `${current.length} frame snapshots match the pre-refactor behavior exactly`);
  }
  document.body.dataset.result = 'pass';
} catch (error) {
  report.push(`ERROR ${error.stack}`);
  document.body.dataset.result = 'fail';
}
if (preview && document.body.dataset.result === 'pass') {
  document.getElementById('start')?.remove();
  // The simulated story clock doesn't advance real CSS pop-in time. At these
  // selected later story moments, show the settled bubble for the still capture.
  document.querySelector('.speech-bubble').style.animation = 'none';
  document.getElementById('stage').classList.add('is-paused');
  results.remove();
} else {
  document.getElementById('stage')?.remove();
  results.textContent = report.join('\n');
}
