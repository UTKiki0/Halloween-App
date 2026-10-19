# Implementation Plan

> EDITING DIRECTIVE: DEVELOPER AND AGENT EDIT THIS FILE COLLABORATIVELY. THE DEVELOPER MUST REVIEW AND APPROVE ITS CONTENT.

Purpose: Track the next useful build checkpoints, verification, and consequential revisions.

## Working agreement

Developer: Keep the browser preview running, choose priorities, test results directly, and plan only the next few checkpoints.

Agent: Read the project documents and inspect the files. Keep each checkpoint small enough to run and judge. Do not expand scope or mark Developer verification complete.

Start or continue a fresh chat with:

`Read the project documents, inspect the current build, and help me complete the next unchecked checkpoint.`

## Checkpoints

Create your own checklist for the next few results, using the workflow in `brief.md` and the current `spec.md`. Name the main risk, what each checkpoint should produce, and how you will verify it. Review and approve the approach before implementation.

Test each result before continuing, including related behavior that already works. Update priorities as evidence emerges and preserve meaningful working checkpoints in git. Before delivery, verify the deployed app against the brief and specification.

**Main risk:** the layered art may not hold up across phone shapes (cropping, blend modes, soft or fringed edges).

- [ ] 1. Project skeleton: `index.html`, `css/`, relative paths (`js/` added when first needed). Verify: loads in Live Server and Simple Browser. *Agent built it; headless Edge renders it. Developer still to confirm in Live Server.*
- [ ] 2. Static composite per `spec.md` checkpoint 1. Verify: screenshots at 390x844, 360x640, 430x932; no scroll; objects fully visible. *Agent checked all three sizes in headless Edge: no scroll, house/coffin/pumpkins fully visible. Taller phones letterbox top and bottom, blended into sky/dirt colors. Developer to confirm by eye.*
- [ ] 3. Credits stub and `research.md` asset log (tool, prompts, license terms). Verify: every file in `assets/art/` used is listed.
- [ ] 4. Commit, enable GitHub Pages (confirm with Developer first). Verify: Developer opens the HTTPS URL on a physical phone.
- [ ] 5. Rolling clouds and fog (`spec.md` checkpoint 2). *Agent verified in headless Edge: 8 animations run; frames at 0 s and 30 s differ; paused frames are byte-identical at 1.5 s and 40 s; reduced motion gives 0 animations and clouds rest in place. Not yet judged by eye in a live browser or on a phone: speeds, bob amount, and fog opacity are first guesses.*
- [ ] 6. Start screen and Play/Pause (`spec.md` checkpoint 3). *Agent verified in headless Edge with scripted clicks, normal and forced reduced-motion: 19 and 16 checks pass (nothing runs before Enter; Enter starts all 8 animations or keeps them still under reduced motion; pause freezes time; resume restarts all; tap targets 156x56 and 51x51; button sits in the bottom 15%, centered). Not yet verified: real keyboard use, real touch, physical phone, and that resume continues from the same spot (headless time stayed at 0).*
- [ ] 7. Wandering character (`spec.md` checkpoint 4). *Agent verified by driving the real `character.js` with a timer-based frame stand-in over 120 simulated seconds: after enlarging to door height (box 34%): x stayed within 17.5-82.9% (allowed 17-83%), 25 walks in both directions, box never crossed a stage edge (smallest gap 0.5px), all 8 frames used, frozen while paused, resumed from the same x. Screenshots at the far left, middle and far right look correct at three phone sizes; character is about 113px tall vs a 120px door at 390px wide. Not verified: how the real `requestAnimationFrame` loop feels in a live browser or on a phone (headless Edge fires only one animation frame, so the stand-in was used); walk speed vs foot sliding, size and position are first guesses.*
- [ ] 8. Grab and drop the character, with a keyboard pointer (`spec.md` checkpoint 5). *Agent verified in headless Edge by driving the real `pointer.js` and `character.js` (timer-based frame stand-in; scripted pointer and keyboard events): 27 checks pass, 0 fail. Includes: paused press does not grab; fist follows the pointer to 0.0px; stays on screen dragging to all four corners and beyond; release from near the top lands in ~1.3 s; wandering resumes about 4 s later; pause mid-hold freezes it; keyboard cursor appears, moves, steers onto the character, Space grabs, arrows carry it up, release drops and it lands; Space on Play/Pause is ignored; mouse hides the keyboard cursor. Earlier tests re-run and still pass (start screen, Play/Pause, wander). Screenshots of the held pose at the left clamp, middle and right clamp look right. Not verified: real touch drag on a phone, real mouse feel, real keyboard repeat behavior, screen reader use, and how the bounce and follow smoothness feel (constants are first guesses).*
- [ ] 9. Story 1, the vampire coffin (`spec.md` checkpoint 6). *Agent verified in headless Edge by driving the real code with scripted pointer events: see the pass counts reported with the checkpoint. Screenshots at fixed story times (0, 0.3, 0.6, 3.0, 4.9, 5.2, 5.6 s) show the character shrinking into the coffin, the rattle with glow and mist, the flash, and the vampire leaping out. Two visual problems found by the screenshots and fixed: shrinking around the feet left the boots sticking out below the coffin, and showing the coffin copy at release hid most of the body at once (fixed by shrinking around the fist and showing the copy only after the character has faded). Not verified: how it looks and feels in real time and on a phone, and timing feel (6 s total is within the brief's 5-10 s, but the rattle length and effect strength are first guesses). Still to do for Story 1: sound, progressive hints, and the reset call when all stories are done.*
- Next, not yet planned in detail: start screen (Enter, reduced-motion check), Play/Pause, then ambient effects and audio one system at a time, then story 1.

## Evidence and revisions

Record non-identifying playtest observations, separating what Users did or said from your interpretation. Use the findings to choose revision priorities and record what changed and how you verified the improvement.

Keep implementation progress and verification here. Update `research.md` when evidence changes a decision and `spec.md` when intended behavior changes; link to those updates rather than duplicating them. Record consequential changes, not every small adjustment.

## Saving transcripts

When directed, save the complete conversation as `transcripts/plan-YYYY-MM-DD_HHMMSS.md` or `transcripts/build-YYYY-MM-DD_HHMMSS.md`, label messages `Developer` and `Agent`, and confirm the path.
