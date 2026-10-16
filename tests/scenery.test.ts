import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import {
  planYieldingContacts,
  propContactResponse,
  type YieldingCollider,
} from "../src/propCollisions.ts";
import {
  sceneryImpact,
  makeSceneryFragments,
  sceneryMaterials,
  limitDebris,
  MAX_SCENERY_DEBRIS,
  vegetationCell,
  type Piece,
} from "../src/sceneryPhysics.ts";

const zero = { x: 0, y: 0, z: 0 },
  normal = { x: 0, y: 0, z: 1 };
test("NPCs and street props respond to closing impacts, while resting and glancing contacts stay intact", () => {
  for (const kind of [
    "npc",
    "lamp",
    "bench",
    "planter",
    "tree",
    "rock",
    "cafe",
    "sculpture",
    "fountain",
    "tire",
  ] as const) {
    assert.equal(
      sceneryImpact(kind, zero, zero, normal, 15),
      null,
      kind + " rests safely",
    );
    assert.equal(
      sceneryImpact(kind, zero, { x: 20, y: 0, z: 0 }, normal, 15),
      null,
      kind + " ignores tangential motion",
    );
    assert.ok(
      sceneryImpact(kind, zero, { x: 0, y: 0, z: -20 }, normal, 15),
      kind + " breaks on a direct hit",
    );
  }
  assert.equal(
    sceneryImpact("npc", zero, { x: NaN, y: 0, z: 0 }, normal, 15),
    null,
  );
});
test("ramps tolerate a normal approach up the incline but break on a severe direct crash", () => {
  const incline = { x: 0, y: Math.cos(0.34), z: Math.sin(0.34) };
  assert.equal(
    sceneryImpact("ramp", zero, { x: 0, y: 0, z: -25 }, incline, 15),
    null,
  );
  assert.ok(sceneryImpact("ramp", zero, { x: 0, y: 0, z: -25 }, normal, 15));
});
test("scenery fragments retain color, conserve mass and have bounded launch speeds and body counts", () => {
  const pieces: Piece[] = Array.from({ length: 30 }, (_, i) => ({
    p: [i, 1, 0],
    s: [0.4, 0.7, 0.3],
    color: i % 2 ? "#835a44" : "#b1d277",
  }));
  const impact = sceneryImpact(
    "npc",
    zero,
    { x: 1000, y: 0, z: -1000 },
    normal,
    15,
  )!;
  const fragments = makeSceneryFragments(pieces, "npc", impact);
  assert.equal(fragments.length, 12);
  assert.ok(
    Math.abs(
      fragments.reduce((sum, f) => sum + f.mass, 0) - sceneryMaterials.npc.mass,
    ) < 1e-10,
  );
  assert.ok(
    fragments.every(
      (f) =>
        Math.hypot(...f.velocity) <= 22.00001 &&
        pieces.some((p) => p.color === f.color),
    ),
  );
  assert.deepEqual(makeSceneryFragments([], "npc", impact), []);
  let live: number[] = [];
  for (let i = 0; i < 500; i++) live = limitDebris(live, [i]);
  assert.equal(live.length, MAX_SCENERY_DEBRIS);
  assert.equal(live.at(-1), 499);
  assert.equal(live[0], 500 - MAX_SCENERY_DEBRIS);
  assert.notEqual(
    vegetationCell(-0.1, 0),
    vegetationCell(0.1, 0),
    "spatial lookup handles negative coordinates",
  );
});

const require = createRequire(import.meta.resolve("@react-three/rapier"));
const R = require("@dimforge/rapier3d-compat");
await R.init();
test("mowing grass and flowers never creates rigid debris that could catch the wheels", () => {
  const grass: Piece[] = [
    { p: [0, 0.1, 0], s: [0.15, 0.22, 0.15], color: "#8dac68", shape: "leaf" },
  ];
  for (const speed of [0, 2, 15, 44]) {
    const impact = {
      velocity: zero,
      incoming: { x: 0, y: 2, z: -speed },
      speed,
    };
    assert.equal(makeSceneryFragments(grass, "foliage", impact).length, 0);
    assert.ok(
      makeSceneryFragments(grass, "tree", impact).length > 0,
      "solid prop destruction remains physical",
    );
  }
});
test("a moving NPC capsule collides with a car and releases it after the NPC breaks into blocks", () => {
  const world = new R.World({ x: 0, y: 0, z: 0 }),
    events = new R.EventQueue(true);
  try {
    const car = world.createRigidBody(
      R.RigidBodyDesc.dynamic()
        .setTranslation(0, 0.95, 5)
        .setLinvel(0, 0, -12)
        .setCcdEnabled(true),
    );
    const carCollider = world.createCollider(
      R.ColliderDesc.cuboid(0.8, 0.4, 1.2)
        .setMass(15)
        .setActiveEvents(R.ActiveEvents.COLLISION_EVENTS),
      car,
    );
    const npc = world.createRigidBody(
      R.RigidBodyDesc.kinematicPositionBased().setTranslation(0, 0.95, 0),
    );
    const npcCollider = world.createCollider(
      R.ColliderDesc.capsule(0.55, 0.36).setActiveEvents(
        R.ActiveEvents.COLLISION_EVENTS,
      ),
      npc,
    );
    let hit = false,
      minimumSpeed = 12;
    const props = new Map<number, YieldingCollider>([
      [npcCollider.handle, { collider: npcCollider, kind: "npc" }],
    ]);
    npcCollider.setActiveHooks(1);
    let planned = planYieldingContacts(props.values(), [car]);
    const grace = new Map(),
      vehicles = new Set([car.handle]);
    const hooks = {
      filterContactPair: (a: number, b: number, bodyA: number, bodyB: number) =>
        propContactResponse(a, b, bodyA, bodyB, planned, grace, vehicles) ?? 1,
      filterIntersectionPair: () => true,
    };
    const blocks: (typeof car)[] = [];
    for (let frame = 0; frame < 100; frame++) {
      const incoming = { ...car.linvel() },
        own = hit ? zero : { ...npc.linvel() };
      if (!hit)
        npc.setNextKinematicTranslation({
          x: Math.sin(frame * 0.02) * 0.08,
          y: 0.95,
          z: 0,
        });
      planned = planYieldingContacts(props.values(), [car]);
      world.step(events, hooks);
      minimumSpeed = Math.min(minimumSpeed, -car.linvel().z);
      events.drainCollisionEvents((a: number, b: number, started: boolean) => {
        if (
          !started ||
          hit ||
          ![a, b].includes(carCollider.handle) ||
          ![a, b].includes(npcCollider.handle)
        )
          return;
        const impact = sceneryImpact("npc", own, incoming, normal, car.mass());
        assert.ok(impact);
        hit = true;
        npcCollider.setEnabled(false);
        npc.setEnabled(false);
        // Match the React removal of the broken NPC's rigid body, not just its visual blocks.
        world.removeRigidBody(npc);
        props.clear();
        const pieces: Piece[] = Array.from({ length: 7 }, (_, i) => ({
          p: [((i % 2) - 0.5) * 0.35, 0.3 + i * 0.23, 0],
          s: [0.2, 0.3, 0.2],
          color: "#de9865",
        }));
        for (const f of makeSceneryFragments(pieces, "npc", impact)) {
          const body = world.createRigidBody(
            R.RigidBodyDesc.dynamic()
              .setTranslation(...f.p)
              .setLinvel(...f.velocity),
          );
          const blockCollider = world.createCollider(
            R.ColliderDesc.cuboid(...f.s.map((n) => n / 2)).setMass(f.mass),
            body,
          );
          blockCollider.setActiveHooks(1);
          grace.set(blockCollider.handle, true);
          blocks.push(body);
        }
      });
    }
    assert.ok(hit, "the car actually contacted the walking collision capsule");
    assert.equal(blocks.length, 7);
    assert.ok(
      minimumSpeed > 11.8,
      "a hit on the NPC does not stop or bounce the car",
    );
    assert.ok(
      blocks.some((block) => Math.abs(block.translation().z) > 2),
      "NPC blocks fly with inherited impact momentum",
    );
    assert.ok(
      car.translation().z < 0,
      "no invisible NPC collider remains in the road",
    );
  } finally {
    events.free();
    world.free();
  }
});
test("breaking one fixture removes its collider without disabling neighbouring props in the shared static body", () => {
  const world = new R.World({ x: 0, y: 0, z: 0 });
  try {
    const street = world.createRigidBody(R.RigidBodyDesc.fixed());
    const bench = world.createCollider(
      R.ColliderDesc.cuboid(1, 0.6, 0.5).setTranslation(0, 0.6, 0),
      street,
    );
    const lamp = world.createCollider(
      R.ColliderDesc.cuboid(0.2, 2.6, 0.2).setTranslation(5, 2.6, 0),
      street,
    );
    bench.setEnabled(false);
    world.step();
    assert.equal(bench.isEnabled(), false);
    assert.equal(lamp.isEnabled(), true);
    assert.equal(street.isEnabled(), true);
  } finally {
    world.free();
  }
});
