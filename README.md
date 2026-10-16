# Seth Kallis — A Little World of Work

A driving portfolio set in a small, connected town. Explore streets, squares, a café terrace, and green spaces in any order. The introduction opens when the world is ready. Other CV chapters open automatically as the car reaches their neighbourhoods, pausing the car while visitors read. Each chapter opens automatically once per visit; **Continue driving** resumes exploration.

Built with React, TypeScript, Vite, Three.js, React Three Fiber, and Rapier. The interaction direction is inspired by [Bruno Simon’s 2019 portfolio](https://2019.bruno-simon.com/). The town, vehicle, and scenery are original procedural geometry.

## Explore

| Town destination   | Portfolio chapter                                        |
| ------------------ | -------------------------------------------------------- |
| Seth’s Square      | Introduction, tools, and interests                       |
| Data Studio        | Work experience                                          |
| Makers’ Yard       | Seven earlier web projects, live links, and repositories |
| The Library        | Education                                                |
| Post Office Garden | Email, LinkedIn, and GitHub                              |

Animated sculptures, building signs, street lettering, and a labelled town map identify the chapters. Map markers, chapter buttons, and **Portfolio** also open the reader directly. There are no laps, checkpoints, finish line, or timers.

The reader preserves the original CV entries, external project links, contact links, and supplied PDF. It supports keyboard focus trapping, Escape, chapter tabs, entry selectors, and **Continue driving**. Resetting the car or props preserves explored chapters; reloading starts a new visit.

## Drive

| Control            | Action                          |
| ------------------ | ------------------------------- |
| W / Up             | Accelerate                      |
| S / Down           | Brake, then reverse             |
| A D / Left Right   | Steer while moving              |
| Shift              | Boost                           |
| B / Control        | Handbrake                       |
| Space              | Hop                             |
| E / Enter          | Revisit a nearby chapter        |
| Escape             | Close the reader or help        |
| Mouse drag / wheel | Orbit / zoom the camera         |
| M                  | Toggle the town map             |
| R                  | Respawn on the starting street  |
| V                  | Restore props and reset the car |
| H                  | Honk, with audio enabled        |

Touch controls provide steering, acceleration, reverse, and jump. Audio is optional. Driving remains fully manual, with no automatic steering or braking.

The detailed GT racecar retains four raycast wheels, spring suspension, tire forces, speed-sensitive steering, boost, brake lights, and a fully rotating dynamic chassis. It can bounce, flip, roll, and carry momentum through collisions. The steady angled camera follows the interpolated vehicle position after the fixed physics step. Press **R** or **Unstuck** to recover.

NPCs have moving collision capsules. A vehicle hit scatters their seven coloured body blocks with physical momentum; the broken NPC's collider is removed completely. Buildings and ground remain solid.

Street lamps, benches, planters, café tables and chairs, trees, rocks, the fountain, and career sculptures break into physical pieces when hit hard enough. Grass and flowers clear visually under the car, accompanied by the off-road dust effect. Ground cover creates no rigid bodies, collision fragments, or React state updates while mowing. Only changed instance-matrix ranges are uploaded to the GPU. Tires tumble on gentle contact and shred on hard impacts. Ramps withstand ordinary launches but can break in severe crashes. Destroying a CV sculpture leaves its chapter, map destination, and automatic information popup available.

Lamps, benches, planters, café furniture, NPCs, and tires give way before the collision solver applies a stopping impulse when an impact is strong enough to break them. The car can barrel through these light objects without losing its momentum or receiving an artificial upward kick. Slow bumps retain collision response. Heavy scenery and buildings still resist the car. Fresh scenery debris ignores the vehicle for 0.22 seconds while continuing to collide with the ground and other objects, then resumes normal collisions.

Light props and fresh debris are also excluded from wheel-support rays, so the suspension does not treat them as tiny ramps. Roads, pavements, real ramps, and heavier surfaces still support the wheels normally.

Intact scenery retains instanced rendering and lightweight static colliders. Physical fragments are created only after an impact. Scenery debris is capped at 128 pieces and clears after 18 seconds of active play; existing crate and pot fragments clear after 22 seconds. Debris timers pause with the reader. **R** resets only the car; **V** restores NPCs, props, and vegetation and clears debris while preserving explored chapters.

## Town and performance

Eight connected road segments create intersections and several routes between districts. Buildings and CV sculptures leave streets clear. Asphalt and raised pavements use disjoint surface cells, joined junctions, and exterior curb faces to avoid overlapping edge geometry.

Buildings have windows, awnings, doors, roof details, and signs. Street lamps, planters, benches, a fountain, pedestrians, a café terrace, and nearby houses populate the neighbourhood. Instanced grass, flowers, trees, and rocks fill green spaces while respecting roads and building plots.

Building details share instanced batches. Foliage uses spatial batches for culling. Lighting retains the local reflection environment and shadow map that follows the car. Pixel density is capped at 1.5. Materials and geometry are generated locally; no remote 3D models are required.

For local rendering measurements, open http://127.0.0.1:4173/?performance. The optional overlay reports frame rate, 95th-percentile frame interval, draw calls, triangles, and pixel density. Measurements vary with the device and view. Normal visits do not mount the overlay.

## Develop and preview

Run **npm ci** and **npm run dev** for development. After editing, run **npm run build** and **npm test** to update and verify the production build. **npm start** uses the desktop launcher; **npm run preview -- --port 4173** starts Vite’s local preview at http://127.0.0.1:4173/.

The build checks strict TypeScript before bundling. Tests cover suspension, speed, reverse, jumps, rolls, collision momentum, manual steering, destruction thresholds, fragment bounds, connected streets, building clearance, non-overlapping road and pavement geometry, map bounds, and automatic chapter discovery from every direction.

Changes in this workspace do not automatically update a separate publishing clone or Firebase deployment. GitHub and Firebase publication remain manual.

## Source

- src/data.ts: supplied profile, work, education, and project content.
- src/gameData.ts: CV chapters, entries, links, and district assignments.
- src/worldLayout.ts: shared streets, plazas, building plots, district locations, map projection, and vegetation clearances.
- src/townGeometry.ts: joined road and pavement geometry.
- src/TownLandscape.tsx: street surfaces, crossings, lettering, and scene composition.
- src/TownArchitecture.tsx: batched buildings, signs, lamps, benches, and planters.
- src/TownLife.tsx: pedestrians, fountain, ramps, and destructible props.
- src/TownNature.tsx: spatially batched grass, trees, flowers, and rocks.
- src/WorldLighting.tsx: reflection lighting, focused shadows, and ground.
- src/CareerLandmarks.tsx: five animated CV sculptures.
- src/World.tsx: car, camera, dust, and physics integration.
- src/vehiclePhysics.ts: shared suspension and tire controls.
- src/RacecarModel.tsx: procedural GT racecar.
- src/Destruction.tsx and src/impactMath.ts: breakable props and debris physics.
- src/SceneryDestruction.tsx and src/sceneryPhysics.ts: town-wide destruction, impact thresholds, capped physical debris, and spatial vegetation damage.
- src/SceneInstances.tsx: shared batched scenery rendering.
- src/PortfolioReader.tsx and src/portfolioStops.ts: accessible reader and proximity discovery.
- src/App.tsx: controls, chapter access, town map, HUD, and audio.
- src/RenderDiagnostics.tsx: opt-in local rendering measurements.
- public/seth-kallis-profile.pdf: supplied professional profile.

The professional profile is the source for work and education. Its overlapping Automation Architects dates are preserved. The previous portfolio supplies earlier project links and web skills. The town’s businesses are visual metaphors for CV chapters; no employers, career metrics, or client projects have been invented.
