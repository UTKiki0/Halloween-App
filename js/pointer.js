// One pointer system for the whole scene. Mouse, touch, pen and the keyboard pointer all
// become the same three events (press, move, release) on "grabbables" that scene objects
// register. Later interactions (story triggers) can register the same way.
//
// Coordinates are in "stage units": percent of the stage WIDTH on both axes, so a point
// means the same thing on every phone. (The stage is 100 wide and about 177.7 tall.)
//
// Keyboard pointer: focus the stage, then arrow keys move a pointer and Space is the
// button (hold Space to hold, release Space to let go). Interaction is off while the
// stage is paused, and pausing mid-grab lets go.

const KEY_SPEED_MIN = 30;     // stage units per second when an arrow key is first pressed
const KEY_SPEED_MAX = 95;     // ... after being held for KEY_RAMP_SECONDS
const KEY_RAMP_SECONDS = 0.7;
const ARROWS = {
  ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1],
};

// `scheduleFrame` defaults to requestAnimationFrame; tests pass a timer-based stand-in.
export function createPointerHub(stage, scheduleFrame = requestAnimationFrame) {
  const cursorEl = document.getElementById('cursor');
  const grabbables = [];
  let active = null;                       // { grabbable, pointerId } while something is held
  const isPaused = () => stage.classList.contains('is-paused');

  // ---------- coordinates ----------
  const stageRect = () => stage.getBoundingClientRect();
  function toStagePoint(clientX, clientY) {
    const r = stageRect();
    return { x: ((clientX - r.left) / r.width) * 100, y: ((clientY - r.top) / r.width) * 100 };
  }
  const stageHeightUnits = () => { const r = stageRect(); return (r.height / r.width) * 100; };

  // ---------- grabbing (shared by every input) ----------
  function press(point, pointerId) {
    if (active || isPaused()) return false;
    for (let i = grabbables.length - 1; i >= 0; i -= 1) {     // later registrations sit on top
      if (grabbables[i].hitTest(point)) {
        active = { grabbable: grabbables[i], pointerId };
        grabbables[i].onGrab(point);
        stage.classList.add('is-grabbing');
        return true;
      }
    }
    return false;
  }
  function move(point) { if (active) active.grabbable.onMove(point); }
  function release() {
    if (!active) return;
    const { grabbable } = active;
    active = null;
    stage.classList.remove('is-grabbing');
    grabbable.onRelease();
  }

  // ---------- mouse / touch / pen ----------
  stage.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    hideKeyboardCursor();
    if (press(toStagePoint(e.clientX, e.clientY), e.pointerId)) {
      // Keep getting moves even if the finger leaves the stage. Can throw if the pointer has
      // already ended; the grab still works without capture.
      try { stage.setPointerCapture(e.pointerId); } catch (error) { /* ignore */ }
      e.preventDefault();
    }
  });
  stage.addEventListener('pointermove', (e) => {
    hideKeyboardCursor();
    const point = toStagePoint(e.clientX, e.clientY);
    if (active) {
      if (active.pointerId === e.pointerId) move(point);
    } else if (e.pointerType === 'mouse') {
      // Hover affordance: open hand over something grabbable.
      stage.classList.toggle('can-grab', !isPaused() && grabbables.some((g) => g.hitTest(point)));
    }
  });
  const endPointer = (e) => { if (active && active.pointerId === e.pointerId) release(); };
  stage.addEventListener('pointerup', endPointer);
  stage.addEventListener('pointercancel', endPointer);

  // ---------- keyboard pointer ----------
  const cursor = { x: 50, y: 110, visible: false, pressed: false, heldFor: 0 };
  const arrowsDown = new Set();

  function showKeyboardCursor() {
    if (cursor.visible) return;
    cursor.visible = true;
    cursorEl.hidden = false;
  }
  function hideKeyboardCursor() {
    if (!cursor.visible) return;
    if (cursor.pressed) { cursor.pressed = false; release(); }
    arrowsDown.clear();
    cursor.visible = false;
    cursorEl.hidden = true;
  }
  function renderCursor() {
    cursorEl.style.left = `${cursor.x}%`;
    cursorEl.style.top = `${(cursor.y / stageHeightUnits()) * 100}%`;
    cursorEl.classList.toggle('is-pressed', cursor.pressed);
  }

  stage.addEventListener('keydown', (e) => {
    if (e.target !== stage || e.ctrlKey || e.metaKey || e.altKey) return;   // buttons keep their own keys
    if (e.key in ARROWS) {
      e.preventDefault();
      if (isPaused()) return;
      showKeyboardCursor();
      arrowsDown.add(e.key);
    } else if (e.key === ' ' || e.code === 'Space') {
      e.preventDefault();                       // don't scroll the page
      if (isPaused() || e.repeat) return;
      showKeyboardCursor();
      cursor.pressed = true;
      press({ x: cursor.x, y: cursor.y }, 'keyboard');
    }
  });
  stage.addEventListener('keyup', (e) => {
    if (e.key in ARROWS) arrowsDown.delete(e.key);
    else if (e.key === ' ' || e.code === 'Space') {
      if (cursor.pressed) { cursor.pressed = false; release(); }
    }
  });
  stage.addEventListener('blur', () => hideKeyboardCursor());

  // ---------- per-frame work ----------
  let last = performance.now();
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    if (isPaused()) {
      if (active) release();                    // pausing lets go of whatever is held
      cursor.pressed = false;
    } else if (cursor.visible && arrowsDown.size) {
      cursor.heldFor += dt;
      const speed = KEY_SPEED_MIN + (KEY_SPEED_MAX - KEY_SPEED_MIN) * Math.min(cursor.heldFor / KEY_RAMP_SECONDS, 1);
      let dx = 0; let dy = 0;
      arrowsDown.forEach((key) => { dx += ARROWS[key][0]; dy += ARROWS[key][1]; });
      const length = Math.hypot(dx, dy);
      if (length) {
        cursor.x = Math.min(100, Math.max(0, cursor.x + (dx / length) * speed * dt));
        cursor.y = Math.min(stageHeightUnits(), Math.max(0, cursor.y + (dy / length) * speed * dt));
        if (cursor.pressed) move({ x: cursor.x, y: cursor.y });
      }
    } else {
      cursor.heldFor = 0;
    }
    if (cursor.visible) renderCursor();
    scheduleFrame(frame);
  }
  scheduleFrame(frame);

  return {
    addGrabbable(grabbable) { grabbables.push(grabbable); },
    stageHeightUnits,
  };
}
