import type { RapierCollider, RapierRigidBody } from "@react-three/rapier";
import {
  sceneryImpact,
  type PropKind,
  type SceneryImpact,
} from "./sceneryPhysics.ts";

export const LIGHT_PROPS: ReadonlySet<PropKind> = new Set([
  "lamp",
  "bench",
  "planter",
  "cafe",
  "npc",
  "tire",
]);
export const DEBRIS_CAR_GRACE = 0.22;
const nonSupportingColliders = new WeakSet<RapierCollider>();
export function setWheelSupport(collider: RapierCollider, supports: boolean) {
  if (supports) nonSupportingColliders.delete(collider);
  else nonSupportingColliders.add(collider);
}
export function supportsVehicleWheels(collider: RapierCollider) {
  return !nonSupportingColliders.has(collider);
}
export type YieldingCollider = { collider: RapierCollider; kind: PropKind };
export function contactPairKey(a: number, b: number) {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}
export function propContactResponse(
  a: number,
  b: number,
  bodyA: number,
  bodyB: number,
  planned: ReadonlyMap<string, SceneryImpact>,
  grace: ReadonlyMap<number, unknown>,
  vehicles: { has: (handle: number) => boolean },
) {
  if (
    (grace.has(a) && vehicles.has(bodyB)) ||
    (grace.has(b) && vehicles.has(bodyA))
  )
    return 0;
  return planned.has(contactPairKey(a, b)) ? 0 : null;
}

// Run before the solver. Hooks themselves only read these cached decisions:
// mutating a Rapier body from inside its contact filter would borrow the running world.
export function planYieldingContacts(
  props: Iterable<YieldingCollider>,
  vehicles: Iterable<RapierRigidBody>,
  dt = 1 / 60,
) {
  const planned = new Map<string, SceneryImpact>();
  for (const vehicle of vehicles) {
    if (!vehicle.isValid()) continue;
    const incoming = vehicle.linvel(),
      carPosition = vehicle.translation();
    for (const { collider, kind } of props) {
      if (!collider.isValid() || !collider.isEnabled()) continue;
      const position = collider.translation();
      if (
        (position.x - carPosition.x) ** 2 + (position.z - carPosition.z) ** 2 >
        100
      )
        continue;
      const own = collider.parent()?.linvel() ?? { x: 0, y: 0, z: 0 };
      const relative = {
        x: incoming.x - own.x,
        y: incoming.y - own.y,
        z: incoming.z - own.z,
      };
      const prediction =
        Math.hypot(relative.x, relative.y, relative.z) * dt + 0.08;
      for (let i = 0; i < vehicle.numColliders(); i++) {
        const carCollider = vehicle.collider(i),
          contact = collider.contactCollider(carCollider, prediction);
        if (!contact) continue;
        const normal = contact.normal1;
        if (
          relative.x * normal.x +
            relative.y * normal.y +
            relative.z * normal.z >=
          -0.1
        )
          continue;
        const impact = sceneryImpact(
          kind,
          own,
          incoming,
          normal,
          vehicle.mass(),
        );
        if (impact)
          planned.set(
            contactPairKey(collider.handle, carCollider.handle),
            impact,
          );
      }
    }
  }
  return planned;
}
