import type { RapierContext, RapierRigidBody } from "@react-three/rapier";
import { rotateVector } from "./impactMath.ts";
import { supportsVehicleWheels } from "./propCollisions.ts";

export const wheelLayout = [
  { x: -1.04, z: -1.12, front: true },
  { x: -1.04, z: 1.12, front: false },
  { x: 1.04, z: -1.12, front: true },
  { x: 1.04, z: 1.12, front: false },
];
export const suspension = { anchor: 0.24, rest: 0.28, radius: 0.38 };
export const racecarShape = {
  chassis: {
    half: [0.9, 0.2, 1.72] as [number, number, number],
    position: [0, 0.16, 0] as [number, number, number],
    mass: 4.4,
  },
  cockpit: {
    half: [0.57, 0.26, 0.66] as [number, number, number],
    position: [0, 0.51, 0.12] as [number, number, number],
    mass: 0.35,
  },
};
export const raceSpeed = { cruise: 30, boost: 44, reverse: 10 };
type Vehicle = ReturnType<RapierContext["world"]["createVehicleController"]>;
export type VehicleControls = {
  throttle: number;
  turn: number;
  brake: boolean;
  boost: boolean;
};

export function createVehicle(
  world: RapierContext["world"],
  body: RapierRigidBody,
) {
  const vehicle = world.createVehicleController(body);
  vehicle.indexUpAxis = 1;
  vehicle.setIndexForwardAxis = 2;
  for (const [index, wheel] of wheelLayout.entries()) {
    vehicle.addWheel(
      { x: wheel.x, y: suspension.anchor, z: wheel.z },
      { x: 0, y: -1, z: 0 },
      { x: 1, y: 0, z: 0 },
      suspension.rest,
      suspension.radius,
    );
    vehicle.setWheelSuspensionStiffness(index, 65);
    vehicle.setWheelSuspensionCompression(index, 3.5);
    vehicle.setWheelSuspensionRelaxation(index, 5);
    vehicle.setWheelMaxSuspensionTravel(index, 0.24);
    vehicle.setWheelMaxSuspensionForce(index, 150);
    vehicle.setWheelFrictionSlip(index, 3.1);
    vehicle.setWheelSideFrictionStiffness(index, 1);
  }
  return vehicle;
}

export function vehicleOrientation(body: RapierRigidBody) {
  const q = body.rotation();
  const forward = rotateVector({ x: 0, y: 0, z: -1 }, q);
  const up = rotateVector({ x: 0, y: 1, z: 0 }, q);
  const v = body.linvel();
  return {
    heading: Math.atan2(-forward.x, -forward.z),
    upright: up.y,
    forwardSpeed: v.x * forward.x + v.y * forward.y + v.z * forward.z,
  };
}

// Only tire contacts apply propulsion and steering. Airborne angular momentum
// and collision impulses are left to Rapier; no pose or velocity is overwritten.
export function driveVehicle(
  vehicle: Vehicle,
  body: RapierRigidBody,
  controls: VehicleControls,
  dt: number,
) {
  const { forwardSpeed, upright } = vehicleOrientation(body);
  const { throttle, turn, brake, boost } = controls;
  const limit =
    throttle < 0
      ? raceSpeed.reverse
      : boost
        ? raceSpeed.boost
        : raceSpeed.cruise;
  const opposing = throttle * forwardSpeed < -0.5;
  const engine =
    upright > 0.15 && Math.abs(forwardSpeed) < limit
      ? throttle * (boost ? 36 : 25)
      : 0;
  const steeringTarget = turn * (0.47 / (1 + Math.abs(forwardSpeed) * 0.04));
  const steering =
    (vehicle.wheelSteering(0) ?? 0) +
    (steeringTarget - (vehicle.wheelSteering(0) ?? 0)) *
      (1 - Math.exp(-dt * 10));
  for (const [index, wheel] of wheelLayout.entries()) {
    vehicle.setWheelSteering(index, wheel.front ? steering : 0);
    vehicle.setWheelEngineForce(index, brake || opposing ? 0 : engine);
    vehicle.setWheelBrake(
      index,
      brake
        ? wheel.front
          ? 0.12
          : 0.65
        : opposing
          ? 0.35
          : throttle
            ? 0
            : 0.018,
    );
    vehicle.setWheelFrictionSlip(index, brake && !wheel.front ? 0.65 : 3.1);
  }
  // Light breakable props must not act as ramps under the suspension.
  vehicle.updateVehicle(
    dt,
    undefined,
    undefined,
    (collider) =>
      collider.parent()?.handle !== body.handle &&
      supportsVehicleWheels(collider),
  );
  let contacts = 0;
  for (let index = 0; index < wheelLayout.length; index++) {
    if (vehicle.wheelIsInContact(index)) contacts++;
  }
  // Ground-effect downforce adds grip at racing speeds without locking rotation.
  if (contacts >= 2 && upright > 0.35) {
    body.applyImpulse(
      { x: 0, y: -body.mass() * forwardSpeed ** 2 * 0.004 * dt, z: 0 },
      true,
    );
  }
  return contacts;
}
