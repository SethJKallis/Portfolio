import { impactEnergy, type Vector } from "./impactMath.ts";

export type Tuple = [number, number, number];
export type PropKind =
  | "tree"
  | "rock"
  | "bench"
  | "lamp"
  | "planter"
  | "cafe"
  | "fountain"
  | "sculpture"
  | "ramp"
  | "npc"
  | "foliage"
  | "tire";
export type Piece = {
  p: Tuple;
  s: Tuple;
  color: string;
  rotation?: Tuple;
  shape?: "box" | "leaf" | "pine" | "rock";
};
export type SceneryProp = {
  id: string;
  kind: PropKind;
  p: Tuple;
  half: Tuple;
  pieces: Piece[];
  rotation?: Tuple;
};
export const sceneryMaterials: Record<
  PropKind,
  { mass: number; energy: number }
> = {
  tree: { mass: 4, energy: 10 },
  rock: { mass: 3, energy: 8 },
  bench: { mass: 2, energy: 3 },
  lamp: { mass: 2, energy: 2 },
  planter: { mass: 1.5, energy: 2 },
  cafe: { mass: 2, energy: 2 },
  fountain: { mass: 12, energy: 65 },
  sculpture: { mass: 5, energy: 18 },
  ramp: { mass: 8, energy: 350 },
  tire: { mass: 0.8, energy: 30 },
  npc: { mass: 0.8, energy: 0.35 },
  foliage: { mass: 0.1, energy: 0 },
};
export type SceneryImpact = {
  velocity: Vector;
  incoming: Vector;
  speed: number;
};
export function sceneryImpact(
  kind: PropKind,
  own: Vector,
  other: Vector,
  normal: Vector,
  otherMass: number,
): SceneryImpact | null {
  const material = sceneryMaterials[kind];
  const energy = impactEnergy(own, other, normal, material.mass, otherMass);
  if (!Number.isFinite(energy) || energy < material.energy) return null;
  const incoming = {
    x: other.x - own.x,
    y: other.y - own.y,
    z: other.z - own.z,
  };
  return {
    velocity: own,
    incoming,
    speed: Math.hypot(incoming.x, incoming.y, incoming.z),
  };
}
export const MAX_SCENERY_DEBRIS = 128;
export const SCENERY_DEBRIS_SECONDS = 18;
export function makeSceneryFragments(
  pieces: Piece[],
  kind: PropKind,
  impact: SceneryImpact,
) {
  // Ground cover is a visual effect, never a source of solid debris under the car.
  if (kind === "foliage") return [];
  const selected = [...pieces]
    .sort((a, b) => b.s[0] * b.s[1] * b.s[2] - a.s[0] * a.s[1] * a.s[2])
    .slice(0, 12);
  return selected.map((piece, i) => {
    const angle = i * 2.39996,
      burst = Math.min(impact.speed * 0.16, 3) + 0.4;
    const velocity: Tuple = [
      impact.velocity.x * 0.5 +
        impact.incoming.x * 0.65 +
        Math.cos(angle) * burst,
      Math.max(0, impact.velocity.y * 0.35) + 0.7 + (i % 3) * 0.35,
      impact.velocity.z * 0.5 +
        impact.incoming.z * 0.65 +
        Math.sin(angle) * burst,
    ];
    const length = Math.hypot(...velocity);
    if (length > 22)
      for (let axis = 0; axis < 3; axis++) velocity[axis] *= 22 / length;
    return {
      ...piece,
      velocity,
      spin: [
        Math.sin(i + 1) * 4,
        Math.cos(i + 2) * 3,
        Math.sin(i + 3) * 5,
      ] as Tuple,
      mass: sceneryMaterials[kind].mass / selected.length,
    };
  });
}
export function limitDebris<T>(
  old: T[],
  added: T[],
  limit = MAX_SCENERY_DEBRIS,
) {
  return [...old, ...added].slice(-limit);
}
export function vegetationCell(x: number, z: number) {
  return `${Math.floor(x / 4)},${Math.floor(z / 4)}`;
}
