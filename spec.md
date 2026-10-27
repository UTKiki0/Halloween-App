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
- **Enter** hides the start screen, reveals Play/Pause, focuses the interactive stage, and starts motion and the shared audio context, including background music. Reduced motion starts the scene paused as described below.
- **Reduced motion:** if the device prefers it, the start screen says so and the scene starts still after Enter; the player can turn motion on with Play/Pause. (Decision: honor the preference automatically, no separate toggle.)
- **Play/Pause:** one round icon button, top left (moved from bottom center at the Developer's request; this frees the bottom 15% of the scene), at least 48px. Toggles `is-paused` on the stage via a single `setPlaying()` in `js/main.js`; later systems (audio, timers, interaction, stories) subscribe through `onPlayStateChange`. Icon swaps between pause and play; `aria-label` says "Pause" or "Play".
- Checks: nothing animates before Enter; Enter starts motion (unless reduced); pause freezes, resume continues; tap targets at least 44px; keyboard Tab/Enter/Space reachable; text readable.

### Checkpoint 4: wandering character (DRAFT, pending Developer review)

- A caped character stands in front of the scene near the bottom (under the fog). It idles 1.5-4 s, picks a random spot at least 15% of the stage width away, walks there (facing the direction of travel), and repeats.
- Normal wandering stays on screen: its whole frame box is kept inside the stage (x from 17% to 83% of stage width at the current size). Story 3's approved exit/return finale deliberately walks it out of view while interaction is locked.
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
- **Not yet specified:** a landing sound, sounds for the grab and drop, and any volume or mute control. Background music is specified below.
- Checks: audio context starts suspended and runs after Enter; every cue fires once per run with the right trim points and timing; pause suspends the context and its clock stops; no cue fires during pause; resume continues; a second drop plays nothing; a reset allows all cues again.

### Checkpoint 8: Story 1 hint glow (DRAFT, pending Developer review)

- **Hint (Developer request):** until Story 1 has been played, a faint aura glows around the coffin. It is a soft pink-and-purple ring just outside the coffin's edge (clear in the middle, so the coffin art is untouched), pulsing slowly (3.6 s per cycle, between 30% and 75% strength). It uses the same colors as the story's own glow, so the story reads as an escalation of the hint.
- **When it shows:** from the start until the story begins; it fades out (0.5 s) the moment the story starts and stays off, including after the story ends. `resetStory()` brings it back with the rest of the cycle.
- **Motion rules:** the pulse follows the shared pause rule, so while paused, and when the device prefers reduced motion (the scene starts paused), it holds still at its faint level instead of pulsing. It never blocks taps.
- **Does not meet the brief's hint requirement on its own.** The brief asks for progressive text hints over time that hint without telling. Open: what the text hints say, when each appears (for example after N seconds without progress), and whether the glow itself should strengthen over time.
- Checks: glow shows before the story, centered on the coffin; goes away when the story starts and stays away; returns after a reset; pointer-events none.

### Checkpoint 9: Story 1 text hint, the character's speech bubble (DRAFT, pending Developer review)

- **Hint (Developer request):** now and then the character shows a speech bubble saying exactly "I really want a vampire outfit for Halloween". It hints at the goal without saying what to do.
- **Schedule (provisional, tune by eye):** the first bubble appears 6 s into play; each stays up 4.5 s (with a 0.25 s fade-out); then a random 14-22 s gap before the next. Timing runs on game time, so pausing freezes it.
- **When it speaks:** only while standing or walking and only until Story 1 has started. A bubble is removed at once if the character is picked up or the story starts; after an interruption it waits at least 4 s before the next one. After the story it never speaks again; `resetStory()` restarts the schedule from the 6 s mark.
- **Look:** a cream bubble with a dark purple outline, bold rounded text (about 16 px on a 390 px-wide phone, wrapping to about three lines), a tail pointing at the head, popping in with a small bounce. The bubble sits above the head, follows the character, stays at least 1.5 stage units inside both screen edges (the tail still points at the head), and never blocks taps. Under reduced motion it appears without the bounce.
- **Accessibility:** the bubble is visual only; the same line is announced politely through a screen-reader live region while the bubble is up.
- **Not yet decided:** whether the hint gets more direct the longer the player goes without progress (the brief asks for progressive hints), and whether other lines are needed for Stories 2 and 3.
- Checks: exact line and live region; first bubble near 6 s; 14-22 s gaps; 4.5 s on screen; always fully on screen and above the head; frozen while paused; hidden at once when picked up; hidden when the story starts and never returns afterward; returns about 6 s after a reset.

### The three-story chain (DRAFT, pending Developer review)

1. **Story 1 (built):** drag the character into the coffin; it becomes the vampire.
2. **Story 2, the jack-o'-lantern basket:** tap the big pumpkin three times to carve it into a basket; the vampire then carries it off.
3. **Story 3, trick-or-treating:** drag the basket-carrying vampire to the house door; a skeleton hand fills the basket with candy.

Each story unlocks only after the one before it (the vampire carries the basket; the basket collects the candy). Only the next story's hints show. After collecting candy in Story 3, the vampire walks fully off the right edge. Everything resets together while the character is out of view (hero form, pumpkin back, door closed, hints re-armed); the original hero walks back from that edge to its initial x 32 position, then interaction and the initial hint schedule resume. Each story's sequence is 5-10 s; Story 3 includes the exit and return in that time. Other scene interaction is locked throughout. Triggers differ on purpose: drag-and-drop, then three taps, then drag-and-drop to a new place.

Measurements used below come from `assets/art/fg-scene.png` (941x1672, drawn at 94% of the stage width, 0.0999 stage units per art pixel; x offset 3 units). Reference crops for making art are in `reference/`: `story2-pumpkin-crop.png` and `story3-door-crop.png` (plus `-guides` versions with the target outlined).

### Checkpoint 10: Story 2, the jack-o'-lantern basket (DRAFT, pending Developer review)

**Decisions (Developer, smoke revision approved 2026-10-26):** the big pumpkin leaves the patch; the basket is baked into new character sheets. Working smoke hides the pickup and character swap. Separate lid and crouch-and-lift sprites are not needed.

- **Trigger:** three taps on the big pumpkin (mouse, touch, or Space on the keyboard pointer). Tap target: the pumpkin's upper visible body, about x 63-85, y 125-144 stage units (art x 598-822, y 1250-1440). It sits underneath the character, so the character stays grabbable if it stands in front.
- **Progress (shown by the pumpkin itself, each tap with its own sound and feedback, a 0.8 s animation during which the next tap waits):** tap feedback is a short amber ring around the big pumpkin, fading and expanding on game time. The fence, stones and smaller pumpkins keep a constant color; the whole replacement image does not brighten. Play/Pause freezes the ring, and reset clears it.
  1. Tap 1: the top is cut, revealing the dark hollow; no flying lid.
  2. Tap 2: the face is carved, with chips flying.
  3. Tap 3: the inside lights up and a handle appears: it is now the basket. Progress is kept between taps however long the player waits.
- **Sequence after tap 3 (target about 6 s, acceptance 5-10 s):** a sparkle; the vampire dashes over (existing vampire walk sheet, sped up, fixed 1.5 s); a churning ball of "working" smoke covers both the vampire and the pumpkin for about 2 s. While both are obscured, the big pumpkin is removed using the fill-in background and the character swaps to the basket-carrying sheets. Smoke clears to reveal the vampire carrying the basket and the big pumpkin gone; after a brief reveal, wandering resumes. Other interaction is locked from tap 3 until the sequence ends; Play/Pause freezes the approach, smoke, swap timing and reveal together.
- **Hints:** appear only once Story 1 is done: a faint glow around the pumpkin (same style as the coffin's) and a speech line from the character (draft wording: "I need something to carry my candy" - hints without telling).
- **Art integration (Developer-approved revision):** use the supplied full-scene pumpkin variants with the same sizing and positioning as the base scene. Clip all four variants to the whole pumpkin patch, including its front pumpkins and right edge (`inset(72% 0 5% 50%)`), instead of a tight outline around the big pumpkin. This prevents remnants of the original pumpkin showing beyond the replacement. Smaller pumpkins remain visible as part of each replacement image.
- **Color and boundary cleanup (Developer-approved):** each variant has a static sRGB gamma correction measured against unchanged ground and stone in the base scene; the PNGs remain unchanged. Feather the unchanged collar of the same full-patch region: left 50-62%, top 72-74.5%, bottom 91-95%, right 94-100% of the scene image. The big pumpkin and handle remain inside full-opacity coverage. Color grading stays constant through tap feedback and pause. Inspect all four variants against the base scene, including the settled background after pickup, at the three specified phone sizes.

| Asset | Spec |
|---|---|
| Pumpkin stage A: top cut, lid off, dark hollow | Full-scene source, displayed only over the whole patch |
| Pumpkin stage B: face carved | Same scene sizing and patch clip |
| Pumpkin stage C: lit from inside, with a handle | Same scene sizing and patch clip; keep the handle visible |
| Fill-in background | Same scene sizing and patch clip; the big pumpkin is absent and smaller pumpkins remain |
| Vampire walk, idle and hang while carrying the basket | Derived 8-frame strips, each frame 418x360, using the existing shared character geometry |

**Supplied sources in `assets/art/`:**

| Role | Source |
|---|---|
| Stage A, hollow top | `Carving-ready pumpkin at haunted mansion.png` |
| Stage B, carved face | `Pumpkin cluster outside a haunted mansion.png` |
| Stage C, basket with handle | `Jack-o'-lantern with seamless green handle.png` |
| Big pumpkin removed | `Haunted mansion with glowing pumpkins.png` |
| Basket walk sheet | `exec-52c8fc0a-cd53-4890-823f-45e4ba01e7be.png` |
| Basket idle sheet | `vampire-basket-idle-1772x886.png` |
| Basket hang sheet | `exec-f67e14e2-4c18-4a6d-8f9e-73ec3127f8ca.png` |

All three supplied character sheets already have alpha transparency. The colored RGB values behind transparent pixels in walk/hang are not a visible background and must not be removed. `tools/normalize-basket-sprites.ps1` preserves the artwork and produces `char-vamp-basket-idle.png`, `char-vamp-basket-walk.png`, and `char-vamp-basket-hang.png`. Idle/walk figures are 256 px tall, anchored at the feet and head center, matching the current vampire. The Developer chose a slightly smaller hang animation to fit the existing frame; all eight hang frames use one scale (0.785), anchored at the shared fist hotspot. The original sources remain unchanged. Frame previews and browser screenshots are Agent-checked; Developer real-time and phone review remain pending.

- **Checks:** three taps advance exactly one stage each; taps during a stage's animation wait; progress persists; the sequence starts only after tap 3; the character can still be grabbed before tap 3 and not during the sequence; the pumpkin art lines up with the scene (no visible seam or double pumpkin); smoke covers both the character and pumpkin for about 2 s and conceals both swaps; the reveal shows the basket-carrying vampire and no big pumpkin; the fill-in hides the old pumpkin completely and leaves the front pumpkins untouched; the character ends carrying the basket in walk, idle and hang states; sequence 5-10 s; pause freezes approach, smoke and reveal timing; keyboard path works; reset restores the pumpkin and clears smoke.

### Checkpoint 11: Story 3, trick-or-treating (DRAFT, pending Developer review)

**Decisions (Developer-approved):** drag the character to the door; the supplied skeleton hand offers one wrapped candy, replacing the earlier bowl idea. Afterward the vampire walks off-screen, the cycle resets invisibly, and the original hero walks back. Sound work follows this visual/mechanical checkpoint.

- **Requires:** Story 2 done (the character is carrying the basket).
- **Trigger:** release the character over the door, about x 44-64, y 97-134 stage units (the door opening is art x 442-585, y 1000-1310, which is x 47-61, y 100-131 units).
- **Sequence (about 9.73 s including exit and return):** 0-0.8 s, hop to the doorstep (head center x 54, feet y 131, scale 0.7); 0.8-1.7 s, three visual knock pulses and "Trick or treat!" in the speech bubble/live region; 1.7-2.3 s, reveal the supplied ajar-door art with a warm light spill; 2.3-3.1 s, skeleton hand reaches out with the candy; 3.1-3.9 s, the supplied character frames show the candy falling into the basket; 3.9-4.3 s, show the full basket; 4.3-5.4 s, crouch and cheer while the hand retracts and the door closes; 5.4-6.2 s, hop back to the ground.
- **Exit and return:** from 6.2 s, walk right at 1.5 times the normal walk speed, with matching frame rate and visible candy in the basket. At x 126 the entire frame is outside the stage; reset the earlier stories and remove the vampire costume/basket there. The original hero walks left from that edge back to x 32, then idles and resumes normal wandering. The exit/return positions are functions of elapsed story time, so pause cannot advance the reset. Grabbing remains locked until the return is complete. The initial hint waits about 6 s after the return.
- **Hints:** appear only once Story 2 is done: a faint glow around the door and a speech line (draft wording: "Somebody has their porch light on...").
- **Supplied art and preparation** (originals unchanged in `assets/art/`):

| Asset | Spec |
|---|---|
| `Haunted House with an Open Door.png` | Full-scene image, shown only inside the arched doorway; the rest of the scene stays unchanged |
| `Eight-frame skeleton hand candy sprite sheet.png` | Derived as `story3-hand.png`: 8 frames of 418x220, aligned by wrist; empty entry/exit frames retained; detached release candy omitted because the character sheet supplies its fall |
| `Happy vampire candy collection sequence.png` | Derived as `char-vamp-treat.png`: 8 frames of 418x360, chronological empty-basket, falling-candy, receiving and cheering poses; 0.62 scale matches the existing head size |
| Exit candy | Small code-native SVG candies follow the moving basket until the off-screen reset |

- **Checks:** the door stays locked before Story 2; a cancelled drop does not trigger it; release over the door starts it with mouse/touch or the keyboard pointer; character stands on the doorstep at the intended size; exact spoken/live-region line; hand offers the candy and the character frames show it landing in the basket; hand retracts and door closes before the ground return; vampire walks out with candy; no costume/scene reset until the entire character is off-screen; original hero walks back to x 32 before grabbing resumes; all hints/forms/patch stages reset together; pause freezes every phase including exit and return; complete sequence 5-10 active seconds; a second whole chain works without reloading. Sound cues follow the same paused clock and re-arm once per cycle.

### Stories 2 and 3 sound (Developer-approved selections, 2026-10-27)

Story 2: short excerpts from "PUMPKIN_CARVING:STABBING.WAV" by dansotak for carving; "Cartoon Splat" by Breviceps for hollowing; "cartoon_wink_magic_sparkle.wav" by MLaudio for lighting; "Cartoon Magic Transition" by qubodup for the working smoke. Reuse the existing puff when the smoke clears. No lid tumble or visible lift cue is needed.

Story 3: reuse the existing wooden knock for the three knocks; "Creaking Wood" by Breviceps for opening the door; a brief rustle from "Opening a Candy Wrapper" by danlucaz for the handoff; "funny yay.wav" by Reitanna for the celebration.

Each selected sound's Freesound page lists CC0; links and source durations are in `research.md`. The Developer supplied all seven originals in `assets/sound/`. The runtime uses a 0.7 s, 67,244-byte carving excerpt prepared from source time 10.9 s; it never loads the 61 MB carving original. Other originals are decoded directly, with excerpts and fades selected at playback. Source files remain unchanged.

Story 2 cues: squish on tap 1, carving on tap 2, sparkle on tap 3, working sound at pickup time 2.3 s for 2.5 s, and puff at 4.8 s. Story 3 cues: knocks at 0.86/1.14/1.42 s; 0.6 s creak at 1.7 s; 0.35 s candy rustle at 3.75 s; cheer at 4.575 s during the jump. Cues fire once on active story time; the shared audio context freezes sounds already playing during pause. Levels and final trim points still need Developer listening review.

### Ambient background music (Developer-selected, 2026-10-27)

- **Asset:** `381531__dominictreis__playful-music.mp3` in `assets/sound/`, chosen from the playful shortlist. The original remains unchanged; its Freesound page lists CC0 (source in `research.md`, credited in `CREDITS.md`).
- **Playback:** one looping source in the existing audio context, at gain 0.12 under the story effects, fading in over 1.5 s when first started. It starts after Enter, or once its download finishes if the scene is already playing. With reduced motion it waits for Play. A failed download leaves the existing story effects available.
- **Pause and reset:** Pause suspends the same context as story audio, retaining the music's playhead. Resume continues it; repeated Play calls cannot add copies. Story completion and off-screen resets leave that source running.
- **Checks:** silence before Enter; normal looping past the source end; pause/resume without restart or duplication; late download while playing or paused; missing-file fallback. Final volume and how the musical ending joins the beginning need Developer listening review.

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
