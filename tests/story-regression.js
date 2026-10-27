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
      audio: { play(sound, settings) { cues.push({ sound, settings }); } },
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
    step(1);
    check(!el.classList.contains('is-vamp') && cues.length === 0, 'No story before Enter');
    const pumpkin = targets.length > 1 ? targets[0] : null;
    if (pumpkin) check(!pumpkin.hitTest({ x: 74, y: 134 }), 'Pumpkin locked before Story 1');
    stage.classList.remove('is-paused');
    step(7);
    check(stage.querySelector('.speech-text').textContent === 'I really want a vampire outfit for Halloween',
      'Original hint appears after six seconds');
    drop({ x: 50, y: 80 });
    step(2);
    check(!stage.dataset.story && cues.length === 0, 'Release away from coffin does not trigger story');
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
      character.resetStory();
      check(stage.dataset.pumpkin === '0' && !el.classList.contains('has-basket')
        && stage.querySelector('.working-smoke').style.opacity === '0', 'Reset restores pumpkin, character and smoke');
      check(tapGlow.style.opacity === '0', 'Reset clears pumpkin tap feedback');
      check(!getComputedStyle(el).backgroundImage.includes('basket'), 'Reset restores original hero sprite');
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
  document.getElementById('stage').classList.add('is-paused');
  results.remove();
} else {
  document.getElementById('stage')?.remove();
  results.textContent = report.join('\n');
}
