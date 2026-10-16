export type Vector = { x: number; y: number; z: number };
export type Quaternion = Vector & { w: number };
export type BreakMaterial = "crate" | "pot" | "barrier";
export const breakEnergy: Record<BreakMaterial, number> = {
  crate: 7,
  pot: 2,
  barrier: 4,
};
export function impactEnergy(
  a: Vector,
  b: Vector,
  normal: Vector,
  mass: number,
  otherMass: number,
) {
  const normalSpeed = Math.abs(
    (a.x - b.x) * normal.x + (a.y - b.y) * normal.y + (a.z - b.z) * normal.z,
  );
  const reducedMass = Number.isFinite(otherMass)
    ? (mass * otherMass) / (mass + otherMass)
    : mass;
  return 0.5 * reducedMass * normalSpeed * normalSpeed;
}
export function shouldBreak(material: BreakMaterial, energy: number) {
  return Number.isFinite(energy) && energy >= breakEnergy[material];
}
export type Fracture = {
  position: Vector;
  rotation: Quaternion;
  velocity: Vector;
  incoming: Vector;
  speed: number;
  mass: number;
  seed: number;
};
export function rotateVector(v: Vector, q: Quaternion): Vector {
  const tx = 2 * (q.y * v.z - q.z * v.y),
    ty = 2 * (q.z * v.x - q.x * v.z),
    tz = 2 * (q.x * v.y - q.y * v.x);
  return {
    x: v.x + q.w * tx + q.y * tz - q.z * ty,
    y: v.y + q.w * ty + q.z * tx - q.x * tz,
    z: v.z + q.w * tz + q.x * ty - q.y * tx,
  };
}
export function makeFragments(snapshot: Fracture, size: Vector) {
  let seed = snapshot.seed >>> 0;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const burst = 2 + Math.min(snapshot.speed, 18) * 0.24;
  return Array.from({ length: 12 }, (_, i) => {
    const x = (((i % 3) - 1) * size.x) / 3,
      y = (((Math.floor(i / 3) % 2) - 0.5) * size.y) / 2,
      z = ((Math.floor(i / 6) - 0.5) * size.z) / 2;
    const offset = rotateVector({ x, y, z }, snapshot.rotation);
    const angle = (i * Math.PI * 2) / 12 + random() * 0.45;
    const velocity = {
      x:
        snapshot.velocity.x * 0.45 +
        snapshot.incoming.x * 0.38 +
        Math.cos(angle) * burst,
      y: Math.max(0, snapshot.velocity.y * 0.25) + 2 + random() * burst,
      z:
        snapshot.velocity.z * 0.45 +
        snapshot.incoming.z * 0.38 +
        Math.sin(angle) * burst,
    };
    const length = Math.hypot(velocity.x, velocity.y, velocity.z),
      limit = 22;
    if (length > limit) {
      velocity.x *= limit / length;
      velocity.y *= limit / length;
      velocity.z *= limit / length;
    }
    return {
      position: {
        x: snapshot.position.x + offset.x,
        y: snapshot.position.y + offset.y,
        z: snapshot.position.z + offset.z,
      },
      velocity,
      spin: {
        x: (random() - 0.5) * 14,
        y: (random() - 0.5) * 14,
        z: (random() - 0.5) * 14,
      },
      size: {
        x: (size.x / 3) * 0.92,
        y: (size.y / 2) * 0.92,
        z: (size.z / 2) * 0.92,
      },
      mass: snapshot.mass / 12,
    };
  });
}
