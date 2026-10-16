# Seth Kallis — The Portfolio Grand Prix

A full-screen racing portfolio with a **1.28 km**, 18-metre-wide forest circuit. The introduction opens automatically as soon as the world is ready. New CV chapters open automatically when the car approaches their career landmarks, and the car pauses while the visitor reads. **Continue driving** closes the reader. Each chapter auto-opens once per page visit, so closing it while nearby does not reopen it.

A steady, angled camera follows the car through the forest circuit. Large ground lettering introduces Seth and announces each CV chapter before its automatic stop. Clearings around the sculptures keep their silhouettes visible. All original CV entries, project links, source repositories, and contact details remain available in the reader.

Built with React 19, TypeScript 7, Vite 8, Three.js, React Three Fiber, and Rapier physics. The interaction direction is inspired by [Bruno Simon’s 2019 portfolio](https://2019.bruno-simon.com/); the implementation, scenery, vehicle, and assets here are original procedural work.

## Open

Double-click **Explore Seth's Portfolio** on the desktop, or **Start Portfolio.cmd** in this folder. The launcher starts a local production server at `http://127.0.0.1:4173/` and opens the browser. An existing local server is reused.

The **Portfolio** desktop folder links to `C:\Users\VTand\Documents\ChatGPT\Portfolio`. These are two ways to access the same files. Node.js is already installed on this computer. Nothing has been published online.

## Drive

| Control          | Action                                             |
| ---------------- | -------------------------------------------------- |
| W / Up           | Accelerate                                         |
| S / Down         | Brake, then reverse                                |
| A D / Left Right | Steer while moving                                 |
| Shift            | Boost                                              |
| B / Control      | Handbrake                                          |
| Space            | Hop                                                |
| E / Enter        | Inspect a nearby exhibit, or leave inspection      |
| Escape           | Leave inspection or close help                     |
| Mouse drag       | Orbit the following camera                         |
| Mouse wheel      | Zoom while driving                                 |
| M                | Toggle the world map                               |
| R                | Respawn the vehicle at the starting point          |
| V                | Rebuild the world, clear debris, and reset the car |
| H                | Honk, with audio enabled                           |

Touch screens have separate steering, throttle, reverse, and jump buttons. Audio is optional and starts only when enabled.

Driving is fully manual: **W** accelerates, **A/D** steer, **S** brakes and reverses, and **Shift** boosts. There is no route-following steering or automatic corner braking. Wheel inputs ease in and center when released. Painted chevrons show direction, and small 100/50 braking boards announce technical corners. The camera holds a stable world angle through turns, with eased drag orbit, zoom, and a small speed-based pullback. It follows Rapier’s interpolated visual position after the fixed physics step, rather than sampling raw 60 Hz body positions. Resetting over a large distance snaps the view back to the car. The speedometer reads physical velocity, with HUD updates kept separate from frame-by-frame motion.

No key press is needed to discover a new chapter. You can also press E to revisit a nearby chapter, use the numbered chapter buttons, or open **Portfolio** at any time. E opens the introduction when no exhibit is nearby. Five chapter tabs and entry selectors expose the full CV, project links, repositories, contact links, and the PDF profile. The reader supports keyboard focus trapping, Escape, and **Continue driving**. Manually viewed chapters also count as explored. Resetting the car or rebuilding props preserves explored chapters; reloading starts a fresh visit.

## Circuit

- **Meet Seth / driver’s podium:** background, tools, and interests.
- **Data engine / servers:** career history.
- **Launch lab / rocket:** seven earlier web projects, with live and repository links.
- **Learning stack / books:** education.
- **Signal station / satellite:** email, LinkedIn, and GitHub.

The technical layout is over three times the previous circuit’s length, with a long pit straight, infield esses, a western switchback, and final-corner complexes. It spans approximately 317 × 280 metres and contains turns in both directions. The dynamically scaled map fits the whole course. Textured asphalt, rubber marks, gravel shoulders, red-and-white kerbs, runoff, set-back guardrails, braking boards, and grid markings detail the surface. A slim gantry, pit garages, pit boxes, and crew dress the straight. All ramps, tires, crates, and smashable barriers remain in optional outer play lanes. Lap timing starts when driving begins; crossing the finish after the far side records a lap and session best. R starts a fresh run; V also restores props. Collected stamps stay in the session until the page reloads.

Kerbs use continuous curved strips with shared stripe boundaries and colored top/side faces. Shoulders occupy only the area outside the kerbs, and the ground has one visible surface. This avoids overlapping coplanar boxes and stacked edge surfaces that can flicker while the camera moves. The camera near plane is 0.5 m for more stable depth precision. Kerb collider positions and driving physics are preserved. Geometry tests cover stripe joins, loop closure, and positive triangle winding around the full course.

The scenery uses 64,000 instanced, wind-swaying grass blades, 900 trees with bark textures and fuller canopies, 3,400 flower heads, shrubs, stones, distant hills, waving flags, and five populated grandstands. Lighting includes a local reflection environment and a focused shadow map that follows the car for sharper nearby detail. Terrain, asphalt, bark, and carbon textures are generated locally. Foliage is split into 48-metre instance batches so off-screen trees and shrubs can be culled. Canopies use lighter faceted geometry; distant crowds skip arm animation. Starting-grid paint shares one instance batch, and static scenery is memoized across reader transitions. Pixel density is capped at 1.5 on dense displays. Scenery assets require no external downloads.

The GT racecar has beveled panels, reflective clear-coat paint and glass, carbon trim, six-spoke alloys, brake calipers, tire rings, vents, diffuser fins, exhausts, LED headlights, and working brake lights. It reaches approximately **108 km/h normally** and **158 km/h with Shift boost**, with a reverse gear, speed-sensitive steering, handbrake, and ground-contact downforce. It is a fully rotating dynamic Rapier body with four raycast wheels, spring suspension, and tire forces. Gravity and angular momentum carry it through jumps, flips, and rolls. Dust appears off the road; the handbrake can raise tire smoke.

The wider jump ramp and narrow roll ramp sit outside the racing lane. Hard or off-center collisions can also tip the vehicle. Press **R** or **Unstuck** to recover from your roof. The speed display shows ground contact, airtime, and a reset reminder when overturned.

Crates and striped barriers fracture when collision energy exceeds their material's threshold. Low-speed contact pushes them. Each break creates twelve rigid fragments with inherited momentum, bounded launch speeds, mass, spin, friction, and bounce. Debris clears after 22 seconds of active play. Tire stacks tumble and roll. Set-back guardrails, landmark sculptures, and tree trunks have solid colliders.

Press **V** or the rebuild icon to restore the whole course. **R** respawns the vehicle and resets lap timing while destruction remains. Optional engine audio includes short impact sounds.

## Develop

```powershell
npm ci
npm run dev
```

To update the desktop-launcher version after editing:

```powershell
npm run build
```

For an opt-in rendering overlay, open `http://127.0.0.1:4173/?performance`. It reports frame rate, 95th-percentile frame interval, draw calls, triangles, and pixel density. Normal visits mount no diagnostics overlay. In the local 1400 × 1188, DPR 1 check, the old grid view used 555 draws / 1,028k triangles; the refined view used about 375 draws / 525k triangles. Both reached the display’s 120 FPS. The view angle changed, so this compares the delivered experiences rather than isolating one optimization. These measurements are specific to this machine and view.

Other commands: `npm start` opens the production build; `npm run format` formats the source. The build runs strict TypeScript checking before bundling.

`npm test` checks impact thresholds, fragment mass and launch limits, suspension, speed, reverse, jumps, rolls, and preserved collision momentum. It verifies that steering follows only manual input, that the longer layout turns both ways with clearance between sections, that its map remains in bounds, and that portfolio chapters remain accessible. Automatic chapter tests cover every approach, landmark proximity, distant false triggers, and suppression after a chapter is closed. Browser checks cover automatic introduction opening, resuming driving, reading, and recovery.

## Source

- `src/data.ts`: verified profile, work, education, and project content.
- `src/gameData.ts`: districts, exhibit content, positions, and actions.
- `src/World.tsx`: driving physics, interpolated vehicle tracking, steady camera, and dust.
- `src/RenderDiagnostics.tsx`: opt-in rendering measurements for local QA.
- `src/circuit.ts`: shared technical layout, road width, progress lookup, map projection, and safe trackside placement.
- `src/trackGeometry.ts`: road ribbons and continuous kerbs without overlapping stripe faces.
- `src/CircuitLandscape.tsx`: tarmac, kerbs, guardrails, gantry, pit garages, and optional play lanes.
- `src/CareerLandmarks.tsx`: five themed sculptures and collectible tokens.
- `src/PortfolioReader.tsx`: automatically opened, keyboard-accessible CV reader and profile links.
- `src/portfolioStops.ts`: proximity checks and once-per-visit chapter detection.
- `src/CircuitNature.tsx`: instanced grass, forest, flowers, and animated grandstand spectators.
- `src/CircuitDetails.tsx`: local reflection lighting, focused shadows, surface wear, shrubs, hills, and trackside details.
- `src/SurfaceTextures.ts`: procedural asphalt, grass, bark, and carbon textures.
- `src/RacecarModel.tsx`: procedural No. 07 GT racecar geometry.
- `src/vehiclePhysics.ts`: shared raycast suspension setup, tire controls, and chassis orientation used by the game and physics tests.
- `src/WorldArt.tsx`: ground lettering.
- `src/Destruction.tsx`: destructible props and debris lifetimes.
- `src/impactMath.ts`: collision-energy thresholds and deterministic fragment generation.
- `src/WorldPrimitives.tsx`: shared block geometry and palette.
- `src/App.tsx`: keyboard/touch input, map, game HUD, audio, and exhibit actions.
- `src/style.css` and `src/racing.css`: responsive game interface and racing HUD theme.
- `public/seth-kallis-profile.pdf`: supplied professional profile.
- `scripts/serve.mjs`: local production server; `scripts/launch.mjs`: desktop launcher.

The supplied professional profile is the primary source for work and education. Its overlapping Automation Architects dates are preserved. The previous portfolio provides the earlier project links and web skills. External project deployments may have changed since those projects were created. No client projects, career details, or metrics were invented.

All scenery, exhibits, and vehicle geometry are generated locally. There are no remote 3D models or game assets. Google Fonts provides DM Sans for the HUD when connected, with local system font fallbacks. World exhibit textures use local system fonts. There is no analytics, tracking, or application backend.

Rapier's WebAssembly increases the game bundle size compared with a text-only portfolio. The engine loads separately from the HUD. The production server binds only to this computer and can be stopped by ending the Node.js process whose command line contains this project's `scripts/serve.mjs`.
