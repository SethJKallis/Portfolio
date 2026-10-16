import { test } from "node:test";
import assert from "node:assert/strict";
import {
  impactEnergy,
  makeFragments,
  shouldBreak,
  rotateVector,
} from "../src/impactMath.ts";

test("gentle bumps do not shatter crates, but a fast car hit does", () => {
  const still = { x: 0, y: 0, z: 0 },
    normal = { x: 0, y: 0, z: 1 };
  assert.equal(
    shouldBreak(
      "crate",
      impactEnergy(still, { x: 0, y: 0, z: -1 }, normal, 1.2, 4.5),
    ),
    false,
  );
  assert.equal(
    shouldBreak(
      "crate",
      impactEnergy(still, { x: 0, y: 0, z: -10 }, normal, 1.2, 4.5),
    ),
    true,
  );
  assert.equal(shouldBreak("pot", 3), true);
});
test("glancing along a surface does not count as a direct impact", () => {
  assert.equal(
    impactEnergy(
      { x: 0, y: 0, z: 0 },
      { x: 18, y: 0, z: 0 },
      { x: 0, y: 0, z: 1 },
      1.2,
      4.5,
    ),
    0,
  );
});
test("static-ground impacts use the falling object mass and resting contacts stay intact", () => {
  assert.equal(
    impactEnergy(
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 1, z: 0 },
      1.2,
      Infinity,
    ),
    0,
  );
  assert.equal(
    shouldBreak(
      "crate",
      impactEnergy(
        { x: 0, y: -6, z: 0 },
        { x: 0, y: 0, z: 0 },
        { x: 0, y: 1, z: 0 },
        1.2,
        Infinity,
      ),
    ),
    true,
  );
});
test("fracture conserves mass, inherits impact direction, and caps launch speeds", () => {
  const snapshot = {
    position: { x: 15, y: 2, z: -9 },
    rotation: { x: 0, y: 0, z: 0, w: 1 },
    velocity: { x: 0, y: 0, z: 0 },
    incoming: { x: 0, y: 0, z: -1000 },
    speed: 1000,
    mass: 1.2,
    seed: 42,
  };
  const fragments = makeFragments(snapshot, { x: 1.5, y: 1.5, z: 1.5 });
  assert.equal(fragments.length, 12);
  assert.ok(
    Math.abs(fragments.reduce((m, f) => m + f.mass, 0) - snapshot.mass) < 1e-8,
  );
  assert.ok(
    fragments.every(
      (f) => Math.hypot(f.velocity.x, f.velocity.y, f.velocity.z) <= 22.000001,
    ),
  );
  assert.ok(fragments.every((f) => f.velocity.z < 0));
  assert.ok(fragments.every((f) => Math.abs(f.position.x - 15) < 1));
  assert.deepEqual(
    fragments,
    makeFragments(snapshot, { x: 1.5, y: 1.5, z: 1.5 }),
  );
});
test("fragment origins rotate with the object at its impact location", () => {
  const v = rotateVector(
    { x: 1, y: 0, z: 0 },
    { x: 0, y: Math.sin(Math.PI / 4), z: 0, w: Math.cos(Math.PI / 4) },
  );
  assert.ok(Math.abs(v.x) < 1e-10);
  assert.ok(Math.abs(v.z + 1) < 1e-10);
});
