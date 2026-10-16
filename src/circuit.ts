import { CatmullRomCurve3, Vector3 } from "three";

// A full-length club circuit: long straights, an infield S section, a western
// switchback and two technical complexes. Every steering input stays manual.
export const trackWidth = 18;
export const circuit = new CatmullRomCurve3(
  [
    [135, 100],
    [145, 55],
    [145, -25],
    [132, -90],
    [95, -122],
    [45, -125],
    [20, -104],
    [12, -66],
    [-12, -44],
    [-48, -48],
    [-65, -78],
    [-90, -112],
    [-140, -102],
    [-167, -65],
    [-165, -16],
    [-137, 16],
    [-96, 13],
    [-70, 37],
    [-82, 66],
    [-129, 85],
    [-139, 121],
    [-106, 149],
    [-59, 147],
    [-24, 111],
    [15, 92],
    [55, 105],
    [70, 140],
    [108, 148],
    [135, 125],
  ].map(([x, z]) => new Vector3(x, 0, z)),
  true,
  "centripetal",
);
export function trackPoint(progress: number, offset = 0) {
  const t = ((progress % 1) + 1) % 1;
  const p = circuit.getPointAt(t),
    tangent = circuit.getTangentAt(t);
  const normal = new Vector3(-tangent.z, 0, tangent.x);
  return {
    x: p.x + normal.x * offset,
    z: p.z + normal.z * offset,
    heading: Math.atan2(-tangent.x, -tangent.z),
    normal,
    tangent,
  };
}
export const trackSamples = Array.from({ length: 1024 }, (_, index) =>
  trackPoint(index / 1024),
);
export function nearestTrack(x: number, z: number) {
  let distanceSquared = Infinity,
    index = 0;
  trackSamples.forEach((p, i) => {
    const d = (p.x - x) ** 2 + (p.z - z) ** 2;
    if (d < distanceSquared) {
      distanceSquared = d;
      index = i;
    }
  });
  return {
    distance: Math.sqrt(distanceSquared),
    progress: index / trackSamples.length,
  };
}
const start = trackPoint(0);
export const raceSpawn = {
  x: start.x,
  y: 0.95,
  z: start.z,
  heading: start.heading,
};
export const circuitLength = circuit.getLength();

export function progressDistance(a: number, b: number) {
  const distance = Math.abs(a - b);
  return Math.min(distance, 1 - distance);
}

export function tracksidePoint(
  progress: number,
  preferredOffset: number,
  clearance = 16,
) {
  for (const offset of [
    preferredOffset,
    -preferredOffset,
    preferredOffset * 1.35,
    -preferredOffset * 1.35,
  ]) {
    const p = trackPoint(progress, offset);
    if (nearestTrack(p.x, p.z).distance >= clearance) return { ...p, offset };
  }
  throw new Error(`No clear trackside placement at ${progress}`);
}
const minX = Math.min(...trackSamples.map((p) => p.x)),
  maxX = Math.max(...trackSamples.map((p) => p.x));
const minZ = Math.min(...trackSamples.map((p) => p.z)),
  maxZ = Math.max(...trackSamples.map((p) => p.z));
export const circuitBounds = { minX, maxX, minZ, maxZ };
export function mapPosition(x: number, z: number) {
  const scale = 82 / Math.max(maxX - minX, maxZ - minZ);
  return {
    x: 50 + (x - (minX + maxX) / 2) * scale,
    z: 50 + (z - (minZ + maxZ) / 2) * scale,
  };
}
