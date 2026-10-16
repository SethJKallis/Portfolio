import { BufferGeometry, Color, Float32BufferAttribute } from "three";
import { trackPoint, trackWidth } from "./circuit.ts";

export const roadSegments = 1440;
export const kerbWidth = 0.7;
export const kerbTop = 0.095;

export function trackRibbon(low: number, high: number, height: number) {
  const vertices: number[] = [],
    indices: number[] = [],
    uvs: number[] = [];
  for (let i = 0; i <= roadSegments; i++) {
    for (const offset of [low, high]) {
      const p = trackPoint(i / roadSegments, offset);
      vertices.push(p.x, height, p.z);
      uvs.push(p.x / 12, p.z / 12);
    }
    if (i < roadSegments) {
      const j = i * 2;
      indices.push(j, j + 1, j + 2, j + 1, j + 3, j + 2);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(vertices, 3));
  geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

// Each stripe meets its neighbour at an identical cross-section. There are no
// overlapping box tops or internal end caps for the depth buffer to fight over.
export function kerbRibbon(side: -1 | 1) {
  const vertices: number[] = [],
    colors: number[] = [],
    indices: number[] = [];
  const low = Math.min(
    (side * trackWidth) / 2,
    side * (trackWidth / 2 + kerbWidth),
  );
  const high = Math.max(
    (side * trackWidth) / 2,
    side * (trackWidth / 2 + kerbWidth),
  );
  const paint = [new Color("#eeece0"), new Color("#da5c4a")];
  type Vertex = [number, number, number];
  const quad = (a: Vertex, b: Vertex, c: Vertex, d: Vertex, color: Color) => {
    const start = vertices.length / 3;
    for (const vertex of [a, b, c, d]) {
      vertices.push(...vertex);
      colors.push(color.r, color.g, color.b);
    }
    indices.push(start, start + 1, start + 2, start + 1, start + 3, start + 2);
  };
  for (let i = 0; i < roadSegments; i++) {
    const a = trackPoint(i / roadSegments, low),
      b = trackPoint(i / roadSegments, high);
    const c = trackPoint((i + 1) / roadSegments, low),
      d = trackPoint((i + 1) / roadSegments, high);
    const color = paint[Math.floor(i / 2) % 2];
    quad(
      [a.x, kerbTop, a.z],
      [b.x, kerbTop, b.z],
      [c.x, kerbTop, c.z],
      [d.x, kerbTop, d.z],
      color,
    );
    quad(
      [a.x, -0.025, a.z],
      [a.x, kerbTop, a.z],
      [c.x, -0.025, c.z],
      [c.x, kerbTop, c.z],
      color,
    );
    quad(
      [b.x, kerbTop, b.z],
      [b.x, -0.025, b.z],
      [d.x, kerbTop, d.z],
      [d.x, -0.025, d.z],
      color,
    );
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(vertices, 3));
  geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}
