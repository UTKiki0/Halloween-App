# Technical Specification

> EDITING DIRECTIVE: DEVELOPER AND AGENT EDIT THIS FILE COLLABORATIVELY. THE DEVELOPER MUST REVIEW AND APPROVE ITS CONTENT.

Purpose: Keep a concise, testable description of the experience currently being built.

## Working agreement

Developer: Begin with the running prototype, approve the intended behavior, test it directly, and update this file when the intended result changes.

Agent: Read `AGENTS.md`, `brief.md`, `research.md`, and this file, then inspect the project. Turn decisions into acceptance checks without inventing product choices or freezing details that still require testing.

Start a fresh chat with:

`Read the project documents, inspect the running prototype, and help me specify the next useful build checkpoint.`

## Current build contract

Define only enough to build and verify the current direction:

- the intended User experience and chosen scene, ambience, and story behavior
- the system structure, shared rules, and states that keep audiovisual behavior and interaction coordinated
- the assets and layout needed for that structure, linking to sources and credits in `research.md`
- acceptance checks for the chosen behavior and every requirement in `brief.md`, including accessibility and failure behavior

Reference the brief's fixed requirements rather than copying them. Specify your decisions precisely enough that the Developer and Agent can judge the same result. Leave untested details open until they are needed, and distinguish provisional ideas from approved behavior.

### Checkpoint 1: static composite (DRAFT, pending Developer review)

**Experience:** a vertical phone scene of a cartoony haunted house with a vampire-style coffin (left) and a pumpkin patch (right) under a moonlit, cloudy night sky with ground fog. No motion, audio, start screen, or interaction yet.

**Layer stack, back to front** (art files in `assets/art/`; sources and credits in `research.md`):

1. Sky: `bg-sky.png` (starry indigo sky); the CSS dark indigo gradient on the stage remains as a fallback if the image fails to load.
2. Moon: `fx-moon.png`, upper right, partly behind a cloud.
3. Clouds: `fx-cloud-bank.png`, `fx-cloud-windswept.png`, `fx-cloud-small.png`, at different sizes and depths.
4. Scene: `fg-scene.png` (house, coffin, pumpkins), anchored to the bottom, centered.
5. Fog: `fx-fog.png`, blended with `screen` (black becomes invisible), over the ground and house base.
6. Reserved empty containers for effects/particles, then UI.

`fx-moon-clouds.png` (moon and clouds baked together) is kept as a fallback and is not used in the stack.

**Shared rules**

- The scene fits one portrait viewport with no scrolling or page switching. It scales to fit and never crops the house, coffin, or pumpkins.
- The lower 15% of the viewport stays free of key art for the future Play/Pause control.
- Decorative layers use `pointer-events: none`.
- All asset paths are relative so the site works under GitHub Pages at `/Halloween-App/`.

**Acceptance checks**

- Renders correctly in portrait at 390x844, 360x640, and 430x932: no scrollbars, all three objects fully visible, layers in the stated order.
- Fog and moonlight do not wash out the house, coffin, or pumpkins.
- Works from Live Server locally and from the GitHub Pages URL.
- Developer confirms the look in the browser preview; physical-phone check follows deployment.

### Checkpoint 2: rolling clouds and fog (DRAFT, pending Developer review)

- Three clouds drift left to right at different speeds (70–140 s per pass), wrap off-screen, and bob slightly (about 3% of cloud height, 6–9 s cycles). The moon stays fixed.
- Fog is two layers sliding in opposite directions at different speeds (110 s and 160 s) and opacities. Tiles alternate normal and mirrored so joins are seamless.
- Motion is CSS-only (`translate`/`transform`). One shared rule: the `is-paused` class on `.stage` pauses every animation (the future Play/Pause control toggles it). Under `prefers-reduced-motion`, nothing moves and clouds rest at their starting positions.
- Checks: motion visible and continuous with no gaps or seams; paused frames identical across time; reduced motion shows zero animations.

### Checkpoint 3: start screen and Play/Pause (DRAFT, pending Developer review)

- **Start screen** (title "The Jack-o'-Land", draft tagline, large **Enter** button) covers the dimmed, paused scene. Nothing moves until Enter; Enter is focused on load.
- **Enter** hides the start screen, reveals Play/Pause, moves focus to it, and starts motion. Audio unlock will hook in here once sounds are chosen.
- **Reduced motion:** if the device prefers it, the start screen says so and the scene starts still after Enter; the player can turn motion on with Play/Pause. (Decision: honor the preference automatically, no separate toggle.)
- **Play/Pause:** one round icon button, top left (moved from bottom center at the Developer's request; this frees the bottom 15% of the scene), at least 48px. Toggles `is-paused` on the stage via a single `setPlaying()` in `js/main.js`; later systems (audio, timers, interaction, stories) subscribe through `onPlayStateChange`. Icon swaps between pause and play; `aria-label` says "Pause" or "Play".
- Checks: nothing animates before Enter; Enter starts motion (unless reduced); pause freezes, resume continues; tap targets at least 44px; keyboard Tab/Enter/Space reachable; text readable.

### Checkpoint 4: wandering character (DRAFT, pending Developer review)

- A caped character stands in front of the scene near the bottom (under the fog). It idles 1.5-4 s, picks a random spot at least 15% of the stage width away, walks there (facing the direction of travel), and repeats.
- It never leaves the screen: its whole frame box is kept inside the stage (x from 17% to 83% of stage width at the current size).
- Size: about as tall as the house door (Developer request). One setting, `--char-w` in `css/styles.css` (frame box width, now 48% of stage width: the box grew when the hang art and the vampire were added, and the figure is the same size as when the box was 34%); `character.js` reads it, and walk speed scales with it (0.6 character-widths per second) so stride stays matched.
- It follows the shared pause rule: `js/character.js` reads the stage's `is-paused` class every frame, so Play/Pause, the start screen and reduced motion (scene starts paused) all control it, and it resumes from the same spot.
- Provisional, tune by eye: walk speed, frame rates (walk 8 fps, idle 5 fps), vertical position (4% above the bottom).
- Not interactive yet; whether it triggers or joins a story is undecided.
- Checks: stays on screen at all times; walks both directions; pausing freezes position and frame; resume continues from the same spot; no jump when switching idle and walk.

### Checkpoint 5: grab and drop the character, keyboard pointer (DRAFT, pending Developer review)

- **Grab:** pressing on the character's body (mouse, finger or pen) picks it up. It lifts quickly until its raised fist is under the pointer, switches to the hang animation, and follows the pointer while held. Pointer coordinates are in stage units (percent of stage width), so it behaves the same on every phone.
- **Drag limits:** the visible art always stays on screen, even when the pointer goes past an edge (limits measured from the sprites, in CSS on `.character`).
- **Release:** it falls with gravity to the ground line, bounces once, small (one constant, `BOUNCE`; 0 turns it off), then returns to idle and starts wandering again. The Developer did not choose bounce vs plain landing; the recommended small bounce is in for now.
- **Keyboard pointer (Developer request):** after Enter, focus is on the scene. Arrow keys move a visible pointer (starts slow, speeds up while held); Space is its button: hold Space to hold, release Space to let go. A tap of Space is a click, for later story triggers. The pointer appears only while arrow keys are in use and hides when the mouse or touch is used. Space and arrows only act when the scene itself is focused, so Space still toggles Play/Pause when that button has focus.
- **One pointer system:** `js/pointer.js` turns mouse, touch, pen and the keyboard pointer into press/move/release on registered "grabbables". The character registers one; story triggers can later.
- **Pause:** nothing can be grabbed while paused, and pausing lets go of a held character (it then hangs frozen in mid-fall until resumed).
- **Touch:** the scene sets `touch-action: none`, so dragging does not scroll or zoom the page.
- Checks: fist follows the pointer; stays on screen at all four corners and beyond; release lands in under 2 s from near the top; wandering resumes after landing; pause freezes mid-hold; keyboard: cursor appears, moves, grabs with Space, carries with arrows, drops on release; Space on other controls is left alone; the mouse hides the keyboard pointer.

### Checkpoint 6: Story 1, the vampire coffin (DRAFT, pending Developer review)

Story 1 of the three required stories. Trigger: drag the character over the coffin and let go.

- **Trigger:** releasing the pointer (mouse, touch or the keyboard pointer) inside the coffin zone, about x 4-34 and y 108-151 in stage units, covering the whole coffin. Releasing anywhere else just drops the character as before.
- **Sequence, about 6 s from release to landing:**
  1. 0-0.9 s: the character shrinks and fades into the coffin, shrinking around its raised fist (the part being held) so the whole body converges inside the coffin.
  2. 0.9-4.8 s: a copy of the coffin (the scene art clipped to the coffin) appears in front and rattles, growing stronger; a purple-to-red glow builds; mist puffs rise. Audio goes here later.
  3. 4.8 s: a white flash; the character swaps to the vampire and leaps out of the coffin to the right, growing back to full size; the coffin copy fades; it lands (small bounce) near x 44 and goes idle, then wanders as the vampire.
- **Everything else is locked while it plays:** grabbing the character is blocked from release until it lands. Play/Pause still works: pausing freezes every part of the sequence and resume continues from the same moment.
- **Plays once (Developer decision):** after it ends, dropping the vampire into the coffin does nothing special (it just falls). The vampire can still be grabbed and dragged (vampire hang strip). `resetStory()` (returned by `startCharacter`, not yet called by anything) turns the character back to normal and re-arms the story; the Developer will call it when all three stories are complete so the cycle can run again.
- **Sound (added in checkpoint 7):** see below.
- **Not yet in this checkpoint:** progressive hint text, story progress feedback beyond the effects, a looping ambient scene sound, and the other two stories.
- Checks: release away from the coffin starts no story; release over it starts the sequence; grabbing is blocked during it; the coffin copy rattles, glow and mist appear; pause mid-sequence freezes everything; flash fires when the vampire appears; ends as the vampire, standing on the ground, on screen, full size; effects all off; total length between 5 and 10 s; a second drop does not restart it; reset restores the hero and allows a replay.

### Checkpoint 7: Story 1 sound (DRAFT, pending Developer review)

Sources, licenses and trim reasoning are in `research.md`; credits in `CREDITS.md`.

- **Cues on the story clock (seconds from release):** 0 whoosh as the character shrinks in; 0.9 the restless growl and the rising drone start under the rattle; nine wooden knocks from 1.3 to 4.7 s that speed up and get louder with the rattle; 4.8 the smoke poof with the flash; 4.85 the vampire laugh; 4.9 the cape swoop. 15 sounds per run.
- **One audio switch:** all sounds go through one Web Audio context (`js/audio.js`). Sound is allowed by the Enter tap (the context is resumed inside that click, as mobile browsers require). Play/Pause suspends and resumes the whole context, so every sound mid-play freezes and continues exactly where it stopped, in step with the picture; no new sounds start while paused.
- **Failure behavior:** if a sound cannot load or decode, the scene stays silent for that sound and everything else still works.
- **Not yet specified:** a looping ambient background sound, a landing sound, sounds for the grab and drop, and any volume or mute control.
- Checks: audio context starts suspended and runs after Enter; every cue fires once per run with the right trim points and timing; pause suspends the context and its clock stops; no cue fires during pause; resume continues; a second drop plays nothing; a reset allows all cues again.

**Open (provisional or undecided)**

- Exact moon and cloud placement and sizes, fog opacity: tune by eye.
- Whether coffin, house, and pumpkins need separate tap regions or separate images for stories.
- Ambient effects, audio, start screen, Play/Pause, and stories: specified at later checkpoints.

## Scope and revisions

Record excluded ideas, the next behavior that must work, and consequential requirement changes with their evidence.

- Next behavior that must work: checkpoint 1 above.
- Deployment target: GitHub Pages from `main` root (`https://utkiki0.github.io/Halloween-App/`). Local preview: VS Code Live Server.

## Saving the transcript

When directed, save the complete conversation as `transcripts/spec-YYYY-MM-DD_HHMMSS.md`, label messages `Developer` and `Agent`, and confirm the path.
