import { BufferGeometry, Float32BufferAttribute } from "three";
import { contains, type Rect } from "./worldLayout.ts";

// Partition the union at every rectangle boundary. Junctions share edges instead
// of stacking road planes, and sidewalks explicitly exclude the asphalt.
export function surfaceCells(rects: Rect[], exclude: Rect[] = []): Rect[] {
  const all = [...rects, ...exclude];
  const xs = [...new Set(all.flatMap((r) => [r.minX, r.maxX]))].sort(
    (a, b) => a - b,
  );
  const zs = [...new Set(all.flatMap((r) => [r.minZ, r.maxZ]))].sort(
    (a, b) => a - b,
  );
  const cells: Rect[] = [];
  for (let x = 0; x < xs.length - 1; x++)
    for (let z = 0; z < zs.length - 1; z++) {
      const midX = (xs[x] + xs[x + 1]) / 2,
        midZ = (zs[z] + zs[z + 1]) / 2;
      if (
        rects.some((r) => contains(r, midX, midZ)) &&
        !exclude.some((r) => contains(r, midX, midZ))
      )
        cells.push({
          minX: xs[x],
          maxX: xs[x + 1],
          minZ: zs[z],
          maxZ: zs[z + 1],
        });
    }
  return cells;
}
export function surfaceGeometry(cells: Rect[], height: number, skirts = false) {
  const vertices: number[] = [],
    uvs: number[] = [],
    indices: number[] = [];
  for (const r of cells) {
    const start = vertices.length / 3;
    for (const [x, z] of [
      [r.minX, r.maxZ],
      [r.maxX, r.maxZ],
      [r.minX, r.minZ],
      [r.maxX, r.minZ],
    ]) {
      vertices.push(x, height, z);
      uvs.push(x / 10, z / 10);
    }
    indices.push(start, start + 1, start + 2, start + 1, start + 3, start + 2);
  }
  if (skirts) {
    const edges = new Map<string, [[number, number], [number, number]]>();
    for (const r of cells) {
      const corners: [number, number][] = [
        [r.minX, r.maxZ],
        [r.maxX, r.maxZ],
        [r.maxX, r.minZ],
        [r.minX, r.minZ],
      ];
      for (let i = 0; i < 4; i++) {
        const a = corners[i],
          b = corners[(i + 1) % 4],
          key = [a.join(","), b.join(",")].sort().join("|");
        if (edges.has(key)) edges.delete(key);
        else edges.set(key, [a, b]);
      }
    }
    for (const [a, b] of edges.values()) {
      const start = vertices.length / 3;
      for (const [x, y, z] of [
        [a[0], -0.035, a[1]],
        [b[0], -0.035, b[1]],
        [a[0], height, a[1]],
        [b[0], height, b[1]],
      ]) {
        vertices.push(x, y, z);
        uvs.push(x / 10, z / 10);
      }
      indices.push(
        start,
        start + 1,
        start + 2,
        start + 1,
        start + 3,
        start + 2,
      );
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(vertices, 3));
  geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}
