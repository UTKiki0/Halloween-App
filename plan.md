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
- Next, not yet planned in detail: start screen (Enter, reduced-motion check), Play/Pause, then ambient effects and audio one system at a time, then story 1.

## Evidence and revisions

Record non-identifying playtest observations, separating what Users did or said from your interpretation. Use the findings to choose revision priorities and record what changed and how you verified the improvement.

Keep implementation progress and verification here. Update `research.md` when evidence changes a decision and `spec.md` when intended behavior changes; link to those updates rather than duplicating them. Record consequential changes, not every small adjustment.

## Saving transcripts

When directed, save the complete conversation as `transcripts/plan-YYYY-MM-DD_HHMMSS.md` or `transcripts/build-YYYY-MM-DD_HHMMSS.md`, label messages `Developer` and `Agent`, and confirm the path.
