# Credits

The Jack-o'-Land, a Halloween phone experience.

Developer: **Kjartan Knutson-Ho**

Creative direction, story design, asset selection, and development by Kjartan Knutson-Ho,
with the AI assistance described below.

## Sound

All sounds are from [Freesound](https://freesound.org/) and are released under
[Creative Commons 0](https://creativecommons.org/publicdomain/zero/1.0/) (public domain dedication).
No credit is required; credit is given anyway. Originals are preserved. Most excerpts
are selected at playback; `pumpkin-carve.wav` is a short mono excerpt with adjusted
level and edge fades, prepared by `tools/prepare-carving-audio.ps1`.

| Use in the experience | Sound | Author |
|---|---|---|
| Character shrinks into the coffin | [Whoosh - Magic disappear](https://freesound.org/people/Sadiquecat/sounds/802472/) | Sadiquecat |
| Something restless inside the coffin | [coffin3.ogg](https://freesound.org/people/Kneeling/sounds/642949/) | Kneeling |
| Coffin rattle and doorstep knocks | [coffin wood box movement _CsG.wav](https://freesound.org/people/csaszi/sounds/275214/) | csaszi |
| Glow and mist drone | [Eerie Dark Drone Soundscape](https://freesound.org/people/Werra/sounds/249985/) | Werra |
| Vampire appearance and basket reveal | [Puff of Smoke](https://freesound.org/people/qubodup/sounds/714257/) | qubodup |
| Vampire laugh | [Laughing Vampire Boss, Remastered.wav](https://freesound.org/people/LilMati/sounds/659757/) (built from "Demonic Laugh" by TheSoundmakerqueen) | LilMati |
| Cape swoop as the vampire leaps out | [Large Wings / Superhero Cape Foley](https://freesound.org/people/Cultureshock007/sounds/711122/) | Cultureshock007 |
| Pumpkin carving | [PUMPKIN_CARVING:STABBING.WAV](https://freesound.org/people/dansotak/sounds/137706/) | dansotak |
| Pumpkin hollowing | [Cartoon Splat](https://freesound.org/people/Breviceps/sounds/445117/) | Breviceps |
| Pumpkin lighting | [cartoon_wink_magic_sparkle.wav](https://freesound.org/people/MLaudio/sounds/511485/) | MLaudio |
| Working smoke | [Cartoon Magic Transition](https://freesound.org/people/qubodup/sounds/856641/) (mix of CC0 sounds by Stella1111111 and LilMati) | qubodup |
| Door opening | [Creaking Wood](https://freesound.org/people/Breviceps/sounds/456814/) | Breviceps |
| Candy handoff | [Opening a Candy Wrapper](https://freesound.org/people/danlucaz/sounds/477369/) | danlucaz |
| Happy jump | [funny yay.wav](https://freesound.org/people/Reitanna/sounds/323703/) | Reitanna |
| Looping background music | [Playful Music.mp3](https://freesound.org/people/dominictreis/sounds/381531/) | dominictreis |

## Art

All source scene and character images were generated with **ChatGPT (OpenAI)**
under Kjartan Knutson-Ho's direction. This includes:

- The haunted house, coffin, pumpkin patch, sky, moon, clouds, and fog.
- The original hero and vampire idle, walk, and hanging poses.
- The pumpkin carving, basket, and removed-pumpkin scene variants.
- The basket-carrying vampire, open doorway, skeleton hand, and candy-collection sequence.

Usage terms: [OpenAI Terms of Use](https://openai.com/policies/terms-of-use/),
"Ownership of content" (checked October 27, 2026). As between the user and OpenAI,
the terms assign OpenAI's rights, if any, in generated output to the user, to the
extent permitted by applicable law.

The project adapts those images through sprite extraction, alignment, scaling,
scene clipping, and color matching. Original images are preserved. Basket, hand,
and candy-collection strips are prepared with `tools/normalize-basket-sprites.ps1`.
The candy SVG, working smoke, glows, speech bubbles, and controls are drawn in
project HTML/CSS/SVG code.

The file-by-file source and derived-asset inventory is in [research.md](research.md).
Exact image-generation prompts were not recorded in the repository; its asset
descriptions document their roles and do not reproduce the original prompts.

## Code

Plain HTML, CSS, JavaScript, and PowerShell developed by Kjartan Knutson-Ho with
assistance from **Claude (Anthropic)** and **Codex (OpenAI)**. AI assistance covered
implementation, asset preparation, sound research, debugging, and automated checks.
No external code libraries are bundled. Typography uses system fonts.
