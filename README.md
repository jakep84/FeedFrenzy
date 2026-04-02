# Feed Frenzy

**Feed Frenzy** is a fast-paced 60-second Phaser game built in a 9:16 portrait layout using the shared Spine character rig.

## Live Demo

**Play now:** `https://MY-VERCEL-URL.vercel.app`

## Overview

In **Feed Frenzy**, the player survives a chaotic social-media-style gauntlet by collecting good pickups, avoiding bad ones, and adapting to changing rules every few seconds.

Core loop:

- move the character around the playfield
- collect the correct pickups for the current rule
- avoid incorrect pickups
- survive all 60 seconds with the highest score possible

The game uses a rule-remix structure, where gameplay conditions shift mid-run to keep the player reacting instead of memorizing one pattern.

## Rules

The current implementation cycles through these rules:

- **Clout Chase** — blue good, red bad
- **Bad Take** — red good, blue bad
- **Brain Lag** — controls reversed
- **Touch Grass** — stand inside the moving green zone
- **Main Character Mode** — gold pickups are high value
- **Gremlin Mode** — faster overall pacing

Rule data lives in `data/rules.js`.

## Controls

### Desktop

- **WASD** or **Arrow Keys** to move
- **Space** to start
- **Enter** to start
- **R** to restart from the end screen

### Mobile

- drag anywhere on the screen to move
- tap to start
- tap replay button to restart

## Project Structure

```text
src
├── data/
│   └── rules.js
├── scenes/
│   ├── BootScene.js
│   ├── GameScene.js
│   └── EndScene.js
├── animation-test.js
└── main.js

```

## Key Files

### `main.js`

Creates the Phaser game config, sets portrait resolution, registers the Spine plugin, and loads the three scenes.

### `scenes/BootScene.js`

Preloads the shared Spine skeleton and atlas, then immediately starts the game scene.

### `scenes/GameScene.js`

Contains the main gameplay loop:

- player input and movement
- rule switching
- orb spawning
- collision handling
- scoring
- HUD updates
- touch-grass behavior
- end-of-run transition

### `scenes/EndScene.js`

Displays the final score, rank, result animation, and replay controls.

### `animation-test.js`

Standalone animation viewer for quickly previewing and testing the shared Spine character animations.

## Performance / Optimization Work

My original gameplay version worked, but could feel slow or hitch under load. The current version was optimized in several ways:

- pooled orb objects instead of constantly creating and destroying them
- pooled floating score text instead of spawning new text every hit
- merged orb movement and collision into one loop
- replaced distance checks with squared-distance checks
- updated HUD text only when values actually changed
- throttled `smallPop()` and reaction animation spam
- replaced repeated Touch Grass popup spam with a persistent indicator
- cleaned up `EndScene` input/tween handlers on shutdown

These changes were made to reduce garbage collection spikes, lower per-frame work, and improve responsiveness on weaker devices and browsers.

## Notes / Tradeoffs

- The game prioritizes readability and iteration speed over heavy abstraction.
- The rule system is data-driven enough for quick tuning through `rules.js`.
- Spine animation calls are still central to the feel of the game, so performance fixes focused first on object churn and repeated UI work.

## Running the Project Locally

Install dependencies and run the local dev server using the project’s existing setup.

Typical flow:

```bash
npm install
npm run dev
```

If the parent project uses a different script name, use that project’s configured start command.

## Submission Summary

This submission includes:

- a complete playable gameplay loop
- multiple rule modifiers
- mobile and desktop input support
- score-based ending states
- animation testing support
- performance optimization pass on gameplay and end screen flow

With another 48 hrs I would :

With another 48 hours, I would focus on turning it from a strong prototype into a more finished and memorable arcade game by improving game feel, depth, and presentation. I would add sound effects and music, stronger hit feedback, cleaner rule transitions, and more visual polish so every action feels better moment to moment. I would also improve the gameplay by adding a better difficulty ramp, more varied orb movement patterns, tighter scoring balance, and possibly one or two more distinctive rules so the run feels less predictable and more replayable. On top of that, I would add quality-of-life and replay features like local high score saving, a more polished end screen with score breakdown, faster restart flow, and a final UI pass across mobile and desktop. Altogether, that extra time would go toward making the game feel less like a take-home prototype and more like a small shippable arcade experience.
