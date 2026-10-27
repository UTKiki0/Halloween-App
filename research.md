# Research

> EDITING DIRECTIVE: DEVELOPER AND AGENT EDIT THIS FILE COLLABORATIVELY. THE DEVELOPER MUST REVIEW AND APPROVE ITS CONTENT.

Purpose: Keep the evidence and creative decisions that currently guide the build.

## Working agreement

Developer: Run the starter first. Direct the inquiry, judge sources and options, make consequential decisions, and keep this file current.

Agent: Read `AGENTS.md`, `brief.md`, and this file, then inspect the project. Help compare possibilities, test assumptions quickly, and verify external sources without delaying the prototype for exhaustive research.

Start a fresh chat with:

`Read brief.md and research.md, inspect the running project, and help me develop the scene and three spooky stories.`

## Inquiry and decisions

Record only what informs the next build decisions:

- creative alternatives for the scene, stories, and audiovisual direction, with reasons for your choices
- useful sources and references, what they support, and important limitations
- experiments that resolve uncertainty, the results, and consequential trade-offs

Investigate unfamiliar techniques or asset sources as needed. Verify usage terms and keep source links and required credits here. Distinguish evidence from assumptions; the Agent's recommendation alone is not evidence.

### Decisions so far

- **Scene:** haunted house (focal point) with a vampire-style coffin and a pumpkin patch, each in its own area. Cartoony, spooky-but-playful, ages 10+.
- **Palette:** purple and charcoal structures, orange pumpkins, warm yellow window glow, cool moonlight, lavender fog.
- **Ambience plan (provisional):** fog, moonlit clouds, and window/pumpkin glow flicker; bats optional. Reasons: cheap to animate, readable on a phone, and the glows can later support story triggers.
- **Technical approach:** plain HTML/CSS/JS with stacked image layers; Live Server locally; GitHub Pages for the public HTTPS URL.

### Art assets (ChatGPT, directed by Kjartan Knutson-Ho)

All files are in `assets/art/`. On 2026-10-27, Kjartan Knutson-Ho confirmed that all source artwork was generated with ChatGPT (OpenAI). That attribution applies to every generated source listed below; derived strips retain their source provenance.

Usage terms: [OpenAI Terms of Use](https://openai.com/policies/terms-of-use/), effective January 1, 2026, opened and checked on 2026-10-27. The "Ownership of content" section assigns OpenAI's rights, if any, in output to the user, as between the user and OpenAI and to the extent permitted by applicable law. These generated images are documented under those terms; the CC0 dedication in the audio section applies to the Freesound assets.

Exact generation prompts and model versions are not recorded in the repository and were not supplied during this credits update. The role descriptions below are an asset inventory, not reconstructed or verbatim prompts.

| File | Role |
|---|---|
| `bg-sky.png` | starry indigo night sky, back layer (opaque, 941x1672) |
| `fg-scene.png` | house, coffin, pumpkins (transparent PNG) |
| `fx-fog.png` | ground fog on black, `screen` blend |
| `fx-moon.png` | moon with halo (transparent PNG) |
| `fx-cloud-bank.png`, `fx-cloud-windswept.png`, `fx-cloud-small.png` | clouds (transparent PNGs) |
| `fx-moon-clouds.png` | baked moon and clouds on black; fallback, may be removed |
| `Carving-ready pumpkin at haunted mansion.png` | full-scene variant with the large pumpkin hollowed; shown after tap 1 |
| `Pumpkin cluster outside a haunted mansion.png` | full-scene variant with the large pumpkin's face carved; shown after tap 2 |
| `Jack-o'-lantern with seamless green handle.png` | lit pumpkin basket with a handle; shown after tap 3 |
| `Haunted mansion with glowing pumpkins.png` | full-scene variant with the large pumpkin removed; revealed after pickup |

Character (ChatGPT source images and project-derived strips; the same generation attribution and usage terms apply):

| File | Role |
|---|---|
| `Bald Bat-Cape Hero Walk Cycle.png` | original walk sheet, 4x2 grid, 8 frames, faces right (source, not loaded by the page) |
| `Bald Caped Adventurer Idle Sprite Sheet.png` | original idle sheet, 4x2 grid, 8 frames (source, not loaded by the page) |
| `Eight-frame one-hand hang sprite sheet.png` | original hang sheet, 4x2 grid, 8 frames: hangs by one raised fist, legs dangling (source, not loaded by the page) |
| `Black-caped cookie vampire walk sheet-1.png`, `Black-caped cookie vampire idle cycle-2.png`, `Bald Cookie Vampire Animation Sheet-3.png` | original vampire walk, idle and hang sheets (same layout as the hero sheets; source, not loaded by the page) |
| `char-walk.png`, `char-idle.png`, `char-hang.png` | derived: the hero frames re-cut into 8-frame strips, 418x360 per frame, all sharing one frame box; loaded by the page |
| `char-vamp-walk.png`, `char-vamp-idle.png`, `char-vamp-hang.png` | derived: the vampire frames, cut at exactly the hero scales (0.598, 0.62, 0.80) so the swap in Story 1 does not change size; loaded by the page |
| `vampire-basket-idle-1772x886.png`, `exec-52c8fc0a-cd53-4890-823f-45e4ba01e7be.png`, `exec-f67e14e2-4c18-4a6d-8f9e-73ec3127f8ca.png` | original basket idle, walk and hang sheets supplied by the Developer; source only |
| `char-vamp-basket-idle.png`, `char-vamp-basket-walk.png`, `char-vamp-basket-hang.png` | derived 3344x360 strips (8 frames of 418x360), produced deterministically with `tools/normalize-basket-sprites.ps1`; loaded after Story 2 |
| `char-vamp-treat.png` | derived 3344x360 strip from `Happy vampire candy collection sequence.png`, prepared with `tools/normalize-basket-sprites.ps1 -Pose treat` |
| `story3-hand.png` | derived 3344x220 strip from `Eight-frame skeleton hand candy sprite sheet.png`, prepared with `tools/normalize-basket-sprites.ps1 -Pose hand` |

Why derived strips: the originals were not aligned. The second row sat 12-30px higher than the first (the character would jump between frames 4 and 5), cape tips touched the cell edges, and the idle sheet's cells were 443.5px wide. The strips anchor each frame by head center plus feet (walk, idle) or fist (hang), share one frame box so the sheets swap without a jump, and shrink the files. The hang art was drawn smaller than the walk art, so it was scaled by 0.80 to match head size (walk and idle are scaled to a 256px figure). Measured visible reach from the head center: walk and idle about 0.34 of the box either side; hang 0.49 left and 0.28 right (the cape and arm trail left); the raised fist sits 67.6px left of the head center and 13.4px below the box top. Vampire strips measured the same (extents within 0.005 of the hero's; figure heights within 1%). These numbers drive the CSS variables on `.character`. Generated with a one-off System.Drawing script (not in the repo yet). A few stray specks from the source art remain beside some walk frames; they are tiny.

Known limitation: moon halo has slight edge fringing; check on device.

**Basket sprite preparation, 2026-10-26:** all three source sheets already contain alpha transparency; their hidden RGB backgrounds initially misled the image preview. No background removal or new image generation was needed. The idle source is an aligned 4x2 grid with touching cape tips. Walk/hang art crosses nominal grid boundaries, so connected silhouettes are extracted instead of cutting through baskets or importing neighboring sprite fragments. Idle/walk are scaled to the same 256 px figure height as the existing vampire and anchored by head center and feet. The Developer approved a slightly smaller hang animation to fit the existing frame: one scale, 0.785, aligns every raised fist to the existing pointer hotspot, with head widths roughly 1-2% below the corresponding old hang frames. All sprites fit the existing on-screen extents. The normalizer uses Windows System.Drawing and keeps the originals unchanged; rerun with `powershell.exe -NoProfile -ExecutionPolicy Bypass -File tools/normalize-basket-sprites.ps1`. Existing outputs require `-Replace`, which first preserves copies alongside the new temporary frame previews. Source artwork uses the ChatGPT attribution and usage terms above; exact prompts are not recorded.

### Story 3 supplied art and reset (2026-10-26)

The Developer supplied `Haunted House with an Open Door.png` (941x1672), `Eight-frame skeleton hand candy sprite sheet.png` (1774x887), and `Happy vampire candy collection sequence.png` (1774x887), all with transparency. The ChatGPT attribution and usage terms above apply to these sources; exact prompts are not recorded. The Developer approved adapting the bowl idea to the single wrapped candy shown in these sheets, followed by the vampire walking fully off-screen and the original hero walking back after an invisible cycle reset.

The open-door image is clipped to the original arched opening, preserving the surrounding house and pumpkin layers. The existing System.Drawing normalizer now supports `-Pose treat` and `-Pose hand`, preserving originals and backing up derived outputs before `-Replace`. Fractional 4x2 cell boundaries are rounded consistently. The character uses one 0.62 scale, anchored by head center and feet, retaining detached candy/gesture art while discarding tiny neighboring frame scraps. The hand uses one 0.85 scale and a shared wrist anchor in 418x220 frames; empty frames are retained. Its detached falling candy is omitted because the character frames already show the candy's trajectory. A small code-native SVG keeps candy visible during the exit walk.

All Story 3 motion and its reset run on game time. The initial incremental exit/return measured 10.05 s in the complete check; positions now follow the same explicit story clock as the effects, giving 9.73 s including the finale. No sound research or new Story 3 audio was added in this pass.

### Story 2 overlay color matching (2026-10-26)

The Developer reported a persistent color mismatch and excessive tap flashing. The supplied variants are warmer/brighter than `fg-scene.png`, and the initial tap feedback applied up to 1.32 brightness to the entire patch. The approved correction keeps source PNGs intact, uses static browser SVG component-transfer filters, blends the unchanged collar, and gives the big pumpkin its own brief amber ring.

Gamma was estimated per RGB channel from smooth, opaque pixels in unchanged collar regions (stone, fence/wall and ground; saturated orange and strong edges excluded). The filter uses sRGB to match those sampled values. These measurements describe source-image samples, rather than a user playtest or a guarantee of identical regenerated details.

| Variant | RGB gamma | Mean channel difference before/after correction (0-255) |
|---|---|---|
| Hollow | 1.201, 1.117, 1.096 | 11.01 / 4.40 |
| Carved | 1.217, 1.126, 1.086 | 12.91 / 7.40 |
| Lit basket | 1.356, 1.166, 1.062 | 19.97 / 14.09 |
| Pumpkin removed | 1.335, 1.149, 1.045 | 21.12 / 16.10 |

The blended collar handles remaining differences near the boundary without fading through the changed pumpkin silhouette. Agent inspected captures of tap feedback and the settled replacement at 390x844, carved at 360x640, and lit basket at 430x932. Developer appearance and real-phone review remain pending.

### Audio for Story 1 (chosen by the Developer, 2026-10-19)

All from [Freesound](https://freesound.org/). The license was read on each sound's own page (not inferred from the search filter): all show "Creative Commons 0" (public domain dedication, https://creativecommons.org/publicdomain/zero/1.0/): no permission or credit needed. Credits are given anyway, as the brief requires. Judged from titles, descriptions and tags only; the Developer auditioned them. Downloading requires a Freesound login, so the Developer saved the files into `assets/sound/` (done; file names in the last column). File sizes matched the Freesound pages. Each file was then decoded and measured (loudness every 0.05-1 s) to choose trim points. Findings that shaped the mix: the growl `642949` is very quiet (peak -17.7 dBFS) and builds to a peak around 3-3.75 s, so it is boosted about +11 dB and played from 0.5 s; the drone `249985` rises from -33 dB to -9 dB over 23 s, so its first seconds give a natural build; the laugh `659757` is silent for its first 0.5 s and peaks slightly above 0 dBFS, so it starts at 0.55 s with gain 0.6; `802472`, `275214` and `714257` peak near 0 dBFS; the cape file `711122` has a burst about every 2-3 s, and the cut at 2.9 s (1.3 s long) takes one. The whole set is about 7.2 MB, mostly the 4.7 MB drone: a candidate to compress if load time on phones is a problem.

| Moment | Sound (uploader) | Freesound page | Length | Intended use | File in repo |
|---|---|---|---|---|---|
| Drop-in, 0-0.9 s | "Whoosh - Magic disappear" (Sadiquecat) | https://freesound.org/people/Sadiquecat/sounds/802472/ | 0.24 s | the shrink into the coffin | `assets/sound/802472__sadiquecat__whoosh-magic-disappear.wav` |
| Rattle, 0.9-4.8 s | "coffin3.ogg" (Kneeling) | https://freesound.org/people/Kneeling/sounds/642949/ | 6.4 s | something restless scratching inside; trim to about 3.9 s | `assets/sound/642949__kneeling__coffin3.ogg` |
| Rattle hits | "coffin wood box movement _CsG.wav" (csaszi) | https://freesound.org/people/csaszi/sounds/275214/ | 0.8 s | wooden knocks timed to the shaking | `assets/sound/275214__csaszi__coffin-wood-box-movement-_csg.wav` |
| Glow and mist | "Eerie Dark Drone Soundscape" (Werra) | https://freesound.org/people/Werra/sounds/249985/ | 28 s | drone fading in under the rattle | `assets/sound/249985__werra__eerie-dark-drone-soundscape.wav` |
| Flash, 4.8 s | "Puff of Smoke" (qubodup) | https://freesound.org/people/qubodup/sounds/714257/ | 0.5 s | the poof as the vampire appears (qubodup's own mix of six other CC0 sounds) | `assets/sound/714257__qubodup__puff-of-smoke.wav` |
| Leap out | "Laughing Vampire Boss, Remastered.wav" (LilMati) | https://freesound.org/people/LilMati/sounds/659757/ | 5.0 s | vampire laugh; use about 1.5-2 s (built from "Demonic Laugh" by TheSoundmakerqueen, also CC0, made with voicechanger.io) | `assets/sound/659757__lilmati__laughing-vampire-boss-remastered.wav` |
| Cape swoop | "Large Wings / Superhero Cape Foley" (Cultureshock007) | https://freesound.org/people/Cultureshock007/sounds/711122/ | 43 s | a short excerpt for the leap | `assets/sound/711122__cultureshock007__large-wings-superhero-cape-foley.mp3` |

Considered and not chosen: "Spooky drone G" (frankienoodles, 434794), "Laughing Wicked Vampire Boss" (LilMati, 659756), "Opening the sarcophagus" (Breviceps, 457529; stone slab, not wood). No landing sound found yet; the bounce stays silent unless one is added.

### Audio for Stories 2 and 3 (Developer-approved selections, 2026-10-27)

The Developer approved the following shortlist and supplied all seven originals in `assets/sound/`. Each individual Freesound page was opened and lists Creative Commons 0; selection recommendations used descriptions and durations, not Agent listening. Existing wooden knocks and the smoke puff are reused. Runtime cues and credits are implemented; Developer listening review remains pending.

| Moment | Sound and uploader | Freesound page | Source duration | Intended use |
|---|---|---|---|---|
| Story 2 carving | PUMPKIN_CARVING:STABBING.WAV — dansotak | https://freesound.org/people/dansotak/sounds/137706/ | 3:33.183 | Extract brief carving cues; 58.6 MB original should not be loaded whole by the app |
| Story 2 hollowing | Cartoon Splat — Breviceps | https://freesound.org/people/Breviceps/sounds/445117/ | 0.534 s | Short pumpkin squish |
| Story 2 working smoke | Cartoon Magic Transition — qubodup | https://freesound.org/people/qubodup/sounds/856641/ | 2.500 s | Match smoke duration; uploader describes it as loud, so measure and lower as needed |
| Story 2 lighting | cartoon_wink_magic_sparkle.wav — MLaudio | https://freesound.org/people/MLaudio/sounds/511485/ | 1.271 s | Sparkle when the pumpkin lights up |
| Story 3 door opening | Creaking Wood — Breviceps | https://freesound.org/people/Breviceps/sounds/456814/ | 2.191 s | Short excerpt aligned to the opening |
| Story 3 candy handoff | Opening a Candy Wrapper — danlucaz | https://freesound.org/people/danlucaz/sounds/477369/ | 11.063 s | Brief rustle as the candy reaches the basket |
| Story 3 celebration | funny yay.wav — Reitanna | https://freesound.org/people/Reitanna/sounds/323703/ | 0.464 s | Short voice for the happy jump |

**Preparation and measurements:** the carving original is 61,399,040 bytes, 213.184 s, stereo 48 kHz/24-bit PCM. `tools/prepare-carving-audio.ps1` reads that PCM without external dependencies and preserves it. A measured burst at 11 s supplies the excerpt from 10.9-11.6 s, mixed to mono, normalized to 0.8 peak before 10 ms/40 ms edge fades, and written as 16-bit `pumpkin-carve.wav` (67,244 bytes). The script refuses to overwrite an existing output. The runtime never fetches the long original.

Real Edge decoders measured the excerpts below (before playback gain and the existing 0.8 master gain). The sparkle needed gain above 1 because the source itself is unusually quiet. These figures support initial levels; they do not establish how the mix feels on headphones or phone speakers.

| Cue | Source offset / duration | Peak / RMS dBFS | Playback gain |
|---|---|---|---|
| Carving | prepared clip, 0 / 0.7 s | -1.9 / -22.4 | 0.75 |
| Squish | 0 / 0.534 s | -3.1 / -21.2 | 0.5 |
| Sparkle | 0 / 1.271 s | -24.6 / -45.6 | 5 |
| Working smoke | 0 / 2.5 s | -0.1 / -17.5 | 0.35 |
| Creak | 0 / 0.6 s | -2.3 / -13.1 | 0.25 |
| Candy | 0.75 / 0.35 s | -3.5 / -27.4 | 0.7 |
| Cheer | 0 / 0.464 s | -2.3 / -14.6 | 0.4 |

The reused knock has a faint contact at 0.05 s followed by the strong hit at about 0.25 s. Door knocks use 0.24-0.44 s at gain 0.35, with edge fades, to give each visual pulse one distinct hit. The working sound naturally decays after about 1.5 s, reaching roughly -60 dBFS in its final quarter-second; the existing puff punctuates the reveal. All originals remain unchanged, and the runtime adds about 1.55 MB of new audio.

### Ambient background music (Developer-selected, 2026-10-27)

The Developer requested something more fun than the wind/nighttime shortlist and selected the first playful candidate, [Playful Music.mp3 by dominictreis](https://freesound.org/people/dominictreis/sounds/381531/), supplying `assets/sound/381531__dominictreis__playful-music.mp3` (861,749 bytes). The individual Freesound page was opened and lists Creative Commons 0; the creator describes playful/sneaky music made in GarageBand, tagged bassoon and vibraphone. Recommendation was based on that description, not Agent auditioning.

Edge decodes the original MP3 to 35.663 s. Measured full-track peak is about 0 dBFS and RMS -16.8 dBFS. Initial gain is 0.12 through the existing 0.8 master (about -37 dBFS overall RMS), with a 1.5 s fade on first start. The original is unchanged and loops in one persistent Web Audio source. It is not tied to story reset. Pausing suspends its shared context instead of stopping/recreating the source.

The last 0.1 s measures about -104.5 dBFS versus -19.0 dBFS in the first 0.1 s. The track has a quiet ending; automated looping is verified, but musical continuity at the repeat and the final balance require Developer listening review. No crossfade or musical edit is applied without that evidence.

## Revisions

- **2026-10-27, credits:** the Developer supplied the credit name Kjartan Knutson-Ho and confirmed ChatGPT as the generator for all source artwork. `CREDITS.md` now records the developer, generated-art attribution, official OpenAI usage-terms link, fifteen Freesound sources, and Claude/Codex coding assistance. This inventory accounts for all 35 PNG art files, including source images, derived strips, and the unused moon/cloud fallback. Exact generation prompts/model versions are not recorded; no replacements were invented.

- **2026-10-27, progressive hints:** the Developer requested increasingly obvious speech ending with a direct instruction and approved all three stories' wording and the 6/25/45 s schedule. This replaces the single repeated line and random 14-22 s gaps. The final instruction repeats every 25 s; partial pumpkin progress retains its hint level. The shared speech scheduler advances on available exploration time, retries interrupted lines, and resets for each newly unlocked story/cycle. Exact text and behavior are in `spec.md` checkpoint 9. Deterministic browser checks and phone-size screenshots verify the mechanics and text bounds; they do not establish whether the pacing helps peers discover the stories, which remains a playtest question.

Update decisions when new evidence changes the direction, linking to playtest observations in `plan.md` rather than copying them. Keep chosen behavior and asset requirements in `spec.md`. The Developer confirms when the inquiry is sufficient to continue building; exhaustive research is not a prerequisite.

## Saving the transcript

When directed, save the complete conversation as `transcripts/research-YYYY-MM-DD_HHMMSS.md`, label messages `Developer` and `Agent`, and confirm the path.
