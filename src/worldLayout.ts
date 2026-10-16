export type DistrictId =
  "about" | "experience" | "projects" | "education" | "contact";
export type Rect = { minX: number; maxX: number; minZ: number; maxZ: number };
export type Street = {
  name: string;
  from: [number, number];
  to: [number, number];
  width: number;
};
export const townSpawn = { x: 24, y: 0.95, z: 63, heading: 0 };
export const townBounds = { minX: -125, maxX: 125, minZ: -120, maxZ: 140 };
export const streets: Street[] = [
  { name: "Main Street", from: [-100, 32], to: [100, 32], width: 13 },
  { name: "Foundry Road", from: [-100, -40], to: [100, -40], width: 13 },
  { name: "Cedar Avenue", from: [-56, -100], to: [-56, 100], width: 13 },
  { name: "Park Lane", from: [24, -100], to: [24, 125], width: 13 },
  { name: "Workshop Way", from: [88, -40], to: [88, 100], width: 11 },
  { name: "Garden Street", from: [-56, 88], to: [88, 88], width: 11 },
  { name: "Library Lane", from: [-56, -92], to: [24, -92], width: 11 },
  { name: "Workshop Courtyard", from: [24, 110], to: [78, 110], width: 10 },
];
export const districts: {
  id: DistrictId;
  place: string;
  x: number;
  z: number;
  landmark: [number, number, number];
  rotation: number;
}[] = [
  {
    id: "about",
    place: "Seth’s Square",
    x: 24,
    z: 12,
    landmark: [8, 0, 10],
    rotation: 0,
  },
  {
    id: "experience",
    place: "Data Studio",
    x: -56,
    z: -60,
    landmark: [-73, 0, -56],
    rotation: Math.PI / 2,
  },
  {
    id: "projects",
    place: "Makers’ Yard",
    x: 88,
    z: 8,
    landmark: [70, 0, 8],
    rotation: Math.PI / 2,
  },
  {
    id: "education",
    place: "The Library",
    x: -56,
    z: 67,
    landmark: [-76, 0, 65],
    rotation: Math.PI / 2,
  },
  {
    id: "contact",
    place: "Post Office Garden",
    x: 24,
    z: -77,
    landmark: [43, 0, -77],
    rotation: -Math.PI / 2,
  },
];
export type Building = {
  id: string;
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  color: string;
  roof: string;
  front?: number;
  pitched?: boolean;
};
export const buildings: Building[] = [
  {
    id: "about",
    x: -8,
    z: -12,
    w: 22,
    d: 14,
    h: 7,
    color: "#e8d6ae",
    roof: "#426f66",
    front: 0,
  },
  {
    id: "experience",
    x: -79,
    z: -73,
    w: 18,
    d: 13,
    h: 10,
    color: "#7da29c",
    roof: "#34545a",
    front: Math.PI / 2,
  },
  {
    id: "projects",
    x: 71,
    z: -9,
    w: 18,
    d: 13,
    h: 7,
    color: "#dbae63",
    roof: "#a9654d",
    front: Math.PI / 2,
  },
  {
    id: "education",
    x: -82,
    z: 82,
    w: 20,
    d: 13,
    h: 8,
    color: "#d1c9a3",
    roof: "#597e6e",
    front: Math.PI / 2,
  },
  {
    id: "contact",
    x: 55,
    z: -76,
    w: 12,
    d: 15,
    h: 6,
    color: "#cf9683",
    roof: "#5f8490",
    front: -Math.PI / 2,
  },
  {
    id: "cafe",
    x: -28,
    z: 54,
    w: 17,
    d: 12,
    h: 5.5,
    color: "#f0d8ad",
    roof: "#bd7859",
    front: Math.PI,
    pitched: true,
  },
  {
    id: "house-1",
    x: -27,
    z: -69,
    w: 17,
    d: 16,
    h: 7,
    color: "#d2ad87",
    roof: "#a96d53",
    pitched: true,
  },
  {
    id: "house-2",
    x: 0,
    z: -68,
    w: 16,
    d: 15,
    h: 8,
    color: "#d4c8a9",
    roof: "#5b7a76",
    pitched: true,
  },
  {
    id: "house-3",
    x: -78,
    z: -12,
    w: 18,
    d: 16,
    h: 7,
    color: "#e4bb9d",
    roof: "#92745e",
    pitched: true,
  },
  {
    id: "house-4",
    x: -78,
    z: 12,
    w: 18,
    d: 14,
    h: 6,
    color: "#adbb9b",
    roof: "#56776c",
    pitched: true,
  },
  {
    id: "house-5",
    x: 48,
    z: -14,
    w: 12,
    d: 12,
    h: 6,
    color: "#d9b38c",
    roof: "#8e735e",
    pitched: true,
  },
  {
    id: "house-6",
    x: 53,
    z: 13,
    w: 18,
    d: 12,
    h: 8,
    color: "#b9c9bd",
    roof: "#557b7e",
    pitched: true,
  },
  {
    id: "house-7",
    x: 111,
    z: 2,
    w: 13,
    d: 18,
    h: 7,
    color: "#e2b79b",
    roof: "#a16552",
    pitched: true,
  },
  {
    id: "house-8",
    x: 112,
    z: 55,
    w: 14,
    d: 18,
    h: 7,
    color: "#c1c8a5",
    roof: "#6d8270",
    pitched: true,
  },
  {
    id: "house-9",
    x: 48,
    z: 57,
    w: 18,
    d: 17,
    h: 6,
    color: "#d5a988",
    roof: "#aa7058",
    pitched: true,
  },
  {
    id: "house-10",
    x: 72,
    z: 57,
    w: 13,
    d: 17,
    h: 7,
    color: "#c9d1b5",
    roof: "#66867a",
    pitched: true,
  },
  {
    id: "house-11",
    x: -28,
    z: 70,
    w: 17,
    d: 12,
    h: 6,
    color: "#cad5bd",
    roof: "#627b6c",
    pitched: true,
  },
  {
    id: "house-12",
    x: -5,
    z: 60,
    w: 16,
    d: 15,
    h: 8,
    color: "#dec3a0",
    roof: "#88715a",
    pitched: true,
  },
  {
    id: "house-13",
    x: -5,
    z: 75,
    w: 14,
    d: 9,
    h: 6,
    color: "#b5c7bf",
    roof: "#557d80",
    pitched: true,
  },
  {
    id: "cottage-1",
    x: -105,
    z: -74,
    w: 13,
    d: 16,
    h: 6,
    color: "#d1b395",
    roof: "#8e705d",
    pitched: true,
  },
  {
    id: "cottage-2",
    x: -103,
    z: 60,
    w: 14,
    d: 15,
    h: 6,
    color: "#e5c9aa",
    roof: "#b07a59",
    pitched: true,
  },
];
export const plazas: Rect[] = [
  { minX: -43, maxX: 14, minZ: -4, maxZ: 24 },
  { minX: -91, maxX: -65, minZ: -82, maxZ: -49 },
  { minX: 59, maxX: 80, minZ: -19, maxZ: 21 },
  { minX: -95, maxX: -66, minZ: 55, maxZ: 94 },
  { minX: 35, maxX: 65, minZ: -90, maxZ: -61 },
  { minX: -41, maxX: -16, minZ: 40, maxZ: 66 },
  { minX: 35, maxX: 78, minZ: 100, maxZ: 129 },
];
export function streetRect(street: Street, expand = 0): Rect {
  const horizontal = street.from[1] === street.to[1];
  return {
    minX:
      Math.min(street.from[0], street.to[0]) -
      (horizontal ? 0 : street.width / 2) -
      expand,
    maxX:
      Math.max(street.from[0], street.to[0]) +
      (horizontal ? 0 : street.width / 2) +
      expand,
    minZ:
      Math.min(street.from[1], street.to[1]) -
      (horizontal ? street.width / 2 : 0) -
      expand,
    maxZ:
      Math.max(street.from[1], street.to[1]) +
      (horizontal ? street.width / 2 : 0) +
      expand,
  };
}
export const roadRects = streets.map((street) => streetRect(street));
export const pavingRects = [
  ...streets.map((street) => streetRect(street, 2.6)),
  ...plazas,
];
export function contains(rect: Rect, x: number, z: number, pad = 0) {
  return (
    x >= rect.minX - pad &&
    x <= rect.maxX + pad &&
    z >= rect.minZ - pad &&
    z <= rect.maxZ + pad
  );
}
export function buildingRect(b: Building): Rect {
  return {
    minX: b.x - b.w / 2,
    maxX: b.x + b.w / 2,
    minZ: b.z - b.d / 2,
    maxZ: b.z + b.d / 2,
  };
}
export function isPaved(x: number, z: number, pad = 0) {
  return pavingRects.some((rect) => contains(rect, x, z, pad));
}
export function reservedForTown(x: number, z: number, pad = 0) {
  return (
    isPaved(x, z, pad) ||
    buildings.some((b) => contains(buildingRect(b), x, z, 2 + pad))
  );
}
export function nearestStreet(x: number, z: number) {
  let best = {
    name: streets[0].name,
    distance: Infinity,
    edgeDistance: Infinity,
    x: 0,
    z: 0,
  };
  for (const street of streets) {
    const dx = street.to[0] - street.from[0],
      dz = street.to[1] - street.from[1];
    const t = Math.max(
      0,
      Math.min(
        1,
        ((x - street.from[0]) * dx + (z - street.from[1]) * dz) /
          (dx * dx + dz * dz),
      ),
    );
    const px = street.from[0] + dx * t,
      pz = street.from[1] + dz * t,
      distance = Math.hypot(x - px, z - pz);
    if (distance < best.distance)
      best = {
        name: street.name,
        distance,
        edgeDistance: distance - street.width / 2,
        x: px,
        z: pz,
      };
  }
  return best;
}
export function mapPosition(x: number, z: number) {
  const scale =
    84 /
    Math.max(
      townBounds.maxX - townBounds.minX,
      townBounds.maxZ - townBounds.minZ,
    );
  return {
    x: Math.max(
      2,
      Math.min(98, 50 + (x - (townBounds.minX + townBounds.maxX) / 2) * scale),
    ),
    z: Math.max(
      2,
      Math.min(98, 50 + (z - (townBounds.minZ + townBounds.maxZ) / 2) * scale),
    ),
  };
}
