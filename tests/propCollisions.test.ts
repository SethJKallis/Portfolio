import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import {
  planYieldingContacts,
  propContactResponse,
  contactPairKey,
  LIGHT_PROPS,
  DEBRIS_CAR_GRACE,
  type YieldingCollider,
} from "../src/propCollisions.ts";
import { type SceneryImpact } from "../src/sceneryPhysics.ts";
const require = createRequire(import.meta.resolve("@react-three/rapier"));
const R = require("@dimforge/rapier3d-compat");
await R.init();

test("the car barrels through consecutive light posts without an initial stop, bounce or replacement acceleration", () => {
  const world = new R.World({ x: 0, y: 0, z: 0 }),
    events = new R.EventQueue(true);
  try {
    const car = world.createRigidBody(
      R.RigidBodyDesc.dynamic()
        .setTranslation(0, 0.6, 5)
        .setLinvel(0, 0, -20)
        .setCcdEnabled(true),
    );
    const chassis = world.createCollider(
      R.ColliderDesc.cuboid(0.9, 0.2, 1.72).setMass(4.75),
      car,
    );
    const street = world.createRigidBody(R.RigidBodyDesc.fixed()),
      props = new Map<number, YieldingCollider>();
    for (const z of [0, -4, -8]) {
      const collider = world.createCollider(
        R.ColliderDesc.cuboid(0.2, 2.6, 0.2)
          .setTranslation(0, 2.6, z)
          .setActiveHooks(1)
          .setActiveEvents(R.ActiveEvents.COLLISION_EVENTS),
        street,
      );
      props.set(collider.handle, { collider, kind: "lamp" });
    }
    let hits = 0,
      minimumSpeed = 20,
      largestHop = 0,
      planned = new Map<string, SceneryImpact>();
    const vehicles = new Set([car.handle]),
      grace = new Map();
    const hooks = {
      filterContactPair: (a: number, b: number, bodyA: number, bodyB: number) =>
        propContactResponse(a, b, bodyA, bodyB, planned, grace, vehicles) ?? 1,
      filterIntersectionPair: () => true,
    };
    for (let frame = 0; frame < 60; frame++) {
      planned = planYieldingContacts(props.values(), [car]);
      world.step(events, hooks);
      minimumSpeed = Math.min(minimumSpeed, -car.linvel().z);
      largestHop = Math.max(largestHop, Math.abs(car.linvel().y));
      events.drainCollisionEvents((a: number, b: number, start: boolean) => {
        if (!start) return;
        const prop = props.get(a) ?? props.get(b);
        if (!prop) return;
        assert.ok(
          planned.has(contactPairKey(chassis.handle, prop.collider.handle)),
          "the impact was planned before the impulse solver",
        );
        prop.collider.setEnabled(false);
        props.delete(prop.collider.handle);
        hits++;
      });
    }
    assert.equal(hits, 3);
    assert.ok(minimumSpeed > 19.8, "retains at least 99% of incoming speed");
    assert.ok(largestHop < 0.01, "posts do not kick the chassis upward");
    assert.ok(car.translation().z < -12);
  } finally {
    events.free();
    world.free();
  }
});
test("slow bumps, glancing motion, and heavy objects keep normal contact response", () => {
  const world = new R.World({ x: 0, y: 0, z: 0 });
  try {
    const car = world.createRigidBody(
      R.RigidBodyDesc.dynamic().setTranslation(0, 1, 1.3).setLinvel(0, 0, -0.2),
    );
    world.createCollider(R.ColliderDesc.cuboid(0.9, 0.3, 1).setMass(4.75), car);
    const post = world.createCollider(
      R.ColliderDesc.cuboid(0.2, 2.6, 0.2).setTranslation(0, 2.6, 0),
    );
    assert.equal(
      planYieldingContacts([{ collider: post, kind: "lamp" }], [car]).size,
      0,
    );
    car.setLinvel({ x: 20, y: 0, z: 0 }, true);
    assert.equal(
      planYieldingContacts([{ collider: post, kind: "lamp" }], [car]).size,
      0,
    );
    assert.ok(LIGHT_PROPS.has("lamp"));
    for (const kind of [
      "tree",
      "rock",
      "fountain",
      "ramp",
      "sculpture",
    ] as const)
      assert.ok(!LIGHT_PROPS.has(kind));
    assert.equal(
      propContactResponse(1, 2, 3, 4, new Map(), new Map(), new Set([3])),
      null,
      "buildings and unregistered contacts resolve normally",
    );
  } finally {
    world.free();
  }
});
test("new debris ignores only the vehicle during its short grace period", () => {
  const planned = new Map<string, SceneryImpact>(),
    grace = new Map([[10, { until: DEBRIS_CAR_GRACE }]]),
    vehicles = new Set([7]);
  assert.equal(propContactResponse(10, 20, 8, 7, planned, grace, vehicles), 0);
  assert.equal(propContactResponse(20, 10, 7, 8, planned, grace, vehicles), 0);
  assert.equal(
    propContactResponse(10, 30, 8, 9, planned, grace, vehicles),
    null,
    "ground and other props still collide",
  );
  grace.clear();
  assert.equal(
    propContactResponse(10, 20, 8, 7, planned, grace, vehicles),
    null,
    "ordinary collision response resumes after the grace period",
  );
});
