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

1. Sky: CSS dark indigo gradient (provisional; an image may replace it).
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
