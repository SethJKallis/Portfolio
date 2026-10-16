import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { setWheelSupport } from "../src/propCollisions.ts";
import {
  createVehicle,
  driveVehicle,
  vehicleOrientation,
  racecarShape,
  raceSpeed,
} from "../src/vehiclePhysics.ts";

// Resolve the exact Rapier runtime used by React Three Rapier, including when
// another dependency brings its own older Rapier version.
const require = createRequire(import.meta.resolve("@react-three/rapier"));
const R = require("@dimforge/rapier3d-compat");
await R.init();
const idle = { throttle: 0, turn: 0, brake: false, boost: false };
function rig(x = 0, z = 17) {
  const world = new R.World({ x: 0, y: -18, z: 0 });
  world.createCollider(
    R.ColliderDesc.cuboid(200, 0.1, 200).setTranslation(0, -0.15, 0),
  );
  const body = world.createRigidBody(
    R.RigidBodyDesc.dynamic()
      .setTranslation(x, 1, z)
      .setLinearDamping(0.05)
      .setAngularDamping(0.18)
      .setCcdEnabled(true),
  );
  world.createCollider(
    R.ColliderDesc.cuboid(...racecarShape.chassis.half)
      .setTranslation(...racecarShape.chassis.position)
      .setMass(racecarShape.chassis.mass)
      .setFriction(0.55)
      .setRestitution(0.18),
    body,
  );
  world.createCollider(
    R.ColliderDesc.cuboid(...racecarShape.cockpit.half)
      .setTranslation(...racecarShape.cockpit.position)
      .setMass(racecarShape.cockpit.mass)
      .setFriction(0.55)
      .setRestitution(0.18),
    body,
  );
  const vehicle = createVehicle(world, body);
  const step = (controls = idle) => {
    const contacts = driveVehicle(vehicle, body, controls, 1 / 60);
    world.step();
    return contacts;
  };
  for (let i = 0; i < 180; i++) step();
  return { world, body, vehicle, step };
}

test("suspension supports a parked car and tire forces accelerate, steer and reverse", () => {
  const { world, body, step } = rig();
  try {
    assert.ok(body.translation().y > 0.2 && body.translation().y < 0.7);
    assert.ok(vehicleOrientation(body).upright > 0.98);
    assert.equal(step(), 4);
    for (let i = 0; i < 90; i++) step({ ...idle, throttle: 1 });
    assert.ok(body.translation().z < 8, "W drives toward local -Z");
    assert.ok(vehicleOrientation(body).forwardSpeed > 10);
    for (let i = 0; i < 30; i++) step({ ...idle, throttle: 1, turn: 1 });
    assert.ok(body.translation().x < -0.4, "left steering turns left");
    assert.ok(
      vehicleOrientation(body).upright > 0.8,
      "normal steering remains driveable",
    );
    for (let i = 0; i < 240; i++) step({ ...idle, throttle: -1 });
    assert.ok(
      vehicleOrientation(body).forwardSpeed < -3,
      "braking transitions into reverse",
    );
  } finally {
    world.free();
  }
});

test("light props do not lift the car through suspension rays, while ordinary surfaces still support it", () => {
  const { world, body, step } = rig();
  try {
    const baseline = body.translation().y;
    const fixture = world.createCollider(
      R.ColliderDesc.cuboid(2, 0.06, 2).setTranslation(0, 0.1, 17),
    );
    setWheelSupport(fixture, false);
    for (let i = 0; i < 150; i++) step();
    assert.ok(
      Math.abs(body.translation().y - baseline) < 0.025,
      "a light prop beneath the wheels causes no hop",
    );
    setWheelSupport(fixture, true);
    for (let i = 0; i < 150; i++) step();
    assert.ok(
      body.translation().y > baseline + 0.12,
      "ordinary supporting surfaces still raise the suspension",
    );
  } finally {
    world.free();
  }
});

test("race gearing reaches cruising speed and boost adds a substantial speed increase", () => {
  const { world, body, step } = rig();
  try {
    for (let i = 0; i < 150; i++) step({ ...idle, throttle: 1 });
    const cruise = vehicleOrientation(body).forwardSpeed;
    assert.ok(
      cruise > raceSpeed.cruise * 0.95 && cruise < raceSpeed.cruise * 1.05,
    );
    for (let i = 0; i < 90; i++) step({ ...idle, throttle: 1, boost: true });
    const boost = vehicleOrientation(body).forwardSpeed;
    assert.ok(boost > raceSpeed.boost * 0.95 && boost < raceSpeed.boost * 1.05);
    assert.ok(boost > cruise * 1.35);
    assert.ok(
      vehicleOrientation(body).upright > 0.95,
      "racecar remains stable on a straight",
    );
  } finally {
    world.free();
  }
});

test("steering only follows driver input and returns to neutral when released", () => {
  const { world, body, vehicle, step } = rig();
  try {
    for (let i = 0; i < 90; i++) step({ ...idle, throttle: 1 });
    assert.ok(
      Math.abs(vehicleOrientation(body).heading) < 0.001,
      "accelerating alone never steers",
    );
    assert.ok(Math.abs(vehicle.wheelSteering(0)) < 0.001);
    for (let i = 0; i < 30; i++) step({ ...idle, throttle: 1, turn: 1 });
    assert.ok(
      vehicle.wheelSteering(0) > 0.05,
      "left input turns the front wheels",
    );
    for (let i = 0; i < 60; i++) step({ ...idle, throttle: 1, turn: 0 });
    assert.ok(
      Math.abs(vehicle.wheelSteering(0)) < 0.001,
      "released input centers the wheels without path correction",
    );
  } finally {
    world.free();
  }
});
test("wide ramp produces physical airtime, pitch and a landing", () => {
  const { world, body, step } = rig(-15, 39);
  try {
    const angle = 0.3;
    world.createCollider(
      R.ColliderDesc.cuboid(3, 0.125, 5.5)
        .setTranslation(-15, 1.5, 23)
        .setRotation({
          x: Math.sin(angle / 2),
          y: 0,
          z: 0,
          w: Math.cos(angle / 2),
        }),
    );
    let highest = 0,
      maxPitch = 0,
      flightFrames = 0,
      landed = false;
    for (let i = 0; i < 210; i++) {
      const contacts = step({ ...idle, throttle: 1, boost: true });
      highest = Math.max(highest, body.translation().y);
      maxPitch = Math.max(maxPitch, Math.abs(body.rotation().x));
      if (contacts === 0 && body.translation().y > 2) flightFrames++;
      if (flightFrames > 10 && contacts > 0 && body.translation().z < 15)
        landed = true;
    }
    assert.ok(highest > 3, `jump height ${highest}`);
    assert.ok(flightFrames > 12, `flight lasted ${flightFrames} frames`);
    assert.ok(maxPitch > 0.12, "chassis pitches with the ramp");
    assert.ok(landed, "car returns to wheel contact after the jump");
  } finally {
    world.free();
  }
});

test("one-sided ramp can roll the chassis past its roof", () => {
  const { world, body, step } = rig(-21.1, 36);
  try {
    const angle = 0.34;
    world.createCollider(
      R.ColliderDesc.cuboid(0.575, 0.1, 3.5)
        .setTranslation(-22, 1.1, 23)
        .setRotation({
          x: Math.sin(angle / 2),
          y: 0,
          z: 0,
          w: Math.cos(angle / 2),
        }),
    );
    let minimumUp = 1;
    for (let i = 0; i < 180; i++) {
      step({ ...idle, throttle: 1, boost: true });
      minimumUp = Math.min(minimumUp, vehicleOrientation(body).upright);
    }
    assert.ok(minimumUp < -0.4, `full body rolled; minimum up ${minimumUp}`);
  } finally {
    world.free();
  }
});

test("off-center solid collision rotates the chassis and airborne inputs do not erase spin", () => {
  const { world, body, step } = rig();
  try {
    world.createCollider(
      R.ColliderDesc.cuboid(0.7, 0.7, 0.7).setTranslation(0.9, 0.65, 3),
    );
    let angularSpeed = 0;
    for (let i = 0; i < 100; i++) {
      step({ ...idle, throttle: 1, boost: true });
      const w = body.angvel();
      angularSpeed = Math.max(angularSpeed, Math.hypot(w.x, w.y, w.z));
    }
    assert.ok(angularSpeed > 1, "collision produces angular momentum");
    body.setTranslation({ x: 30, y: 12, z: 30 }, true);
    body.setLinvel({ x: 2, y: 0, z: 0 }, true);
    body.setAngvel({ x: 4, y: 0, z: 3 }, true);
    const before = body.rotation();
    for (let i = 0; i < 20; i++)
      assert.equal(step({ ...idle, throttle: 1, turn: 1 }), 0);
    assert.ok(Math.hypot(body.angvel().x, body.angvel().z) > 4);
    assert.ok(
      Math.abs(body.rotation().x - before.x) > 0.15 ||
        Math.abs(body.rotation().z - before.z) > 0.15,
    );
    assert.ok(Math.abs(body.linvel().x - 2) < 0.1, "no mid-air tire thrust");
  } finally {
    world.free();
  }
});
