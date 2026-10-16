import { test } from "node:test";
import assert from "node:assert/strict";
import {
  streets,
  roadRects,
  pavingRects,
  buildings,
  buildingRect,
  contains,
  townSpawn,
  mapPosition,
  isPaved,
  type Rect,
} from "../src/worldLayout.ts";
import { surfaceCells, surfaceGeometry } from "../src/townGeometry.ts";
import { zones, exhibits } from "../src/gameData.ts";

const overlap = (a: Rect, b: Rect) =>
  Math.min(a.maxX, b.maxX) > Math.max(a.minX, b.minX) &&
  Math.min(a.maxZ, b.maxZ) > Math.max(a.minZ, b.minZ);
test("the town has connected streets, intersections, and a clear starting position", () => {
  assert.ok(roadRects.some((r) => contains(r, townSpawn.x, townSpawn.z)));
  const reached = new Set([0]);
  for (let pass = 0; pass < streets.length; pass++)
    roadRects.forEach((r, i) => {
      if ([...reached].some((j) => overlap(r, roadRects[j]))) reached.add(i);
    });
  assert.equal(reached.size, streets.length);
  assert.ok(streets.some((s) => s.name === "Workshop Courtyard"));
  for (const street of streets)
    for (const [x, z] of [street.from, street.to]) {
      const p = mapPosition(x, z);
      assert.ok(p.x >= 8 && p.x <= 92 && p.z >= 8 && p.z <= 92);
    }
});
test("buildings and CV sculptures leave all driving lanes clear", () => {
  for (const b of buildings) {
    assert.ok(
      !roadRects.some((r) => overlap(r, buildingRect(b))),
      b.id + " clears the streets",
    );
    assert.ok(
      !buildings.some(
        (other) => other !== b && overlap(buildingRect(b), buildingRect(other)),
      ),
      b.id + " has its own plot",
    );
  }
  for (const zone of zones) {
    const x = zone.landmark[0],
      z = zone.landmark[2];
    const footprint = {
      minX: x - 3.5,
      maxX: x + 3.5,
      minZ: z - 3.5,
      maxZ: z + 3.5,
    };
    assert.ok(
      !roadRects.some((r) => overlap(r, footprint)),
      zone.id + " keeps the road open",
    );
    assert.ok(isPaved(x, z));
    assert.ok(exhibits.some((e) => e.id === zone.firstEntry));
  }
  assert.equal(exhibits.filter((e) => e.zone === "experience").length, 6);
  assert.equal(exhibits.filter((e) => e.zone === "projects").length, 7);
  assert.equal(exhibits.filter((e) => e.zone === "education").length, 2);
});
test("junctions and sidewalks are non-overlapping surfaces with positive triangle winding", () => {
  const road = surfaceCells(roadRects),
    paving = surfaceCells(pavingRects, roadRects);
  for (const cells of [road, paving]) {
    for (let i = 0; i < cells.length; i++)
      for (let j = i + 1; j < cells.length; j++)
        assert.ok(!overlap(cells[i], cells[j]));
    const geometry = surfaceGeometry(cells, 0.095, true);
    try {
      const p = geometry.getAttribute("position"),
        index = geometry.getIndex()!;
      for (let i = 0; i < index.count; i += 3) {
        const a = index.getX(i),
          b = index.getX(i + 1),
          c = index.getX(i + 2);
        if (p.getY(a) !== p.getY(b) || p.getY(a) !== p.getY(c)) continue;
        const area =
          (p.getZ(b) - p.getZ(a)) * (p.getX(c) - p.getX(a)) -
          (p.getX(b) - p.getX(a)) * (p.getZ(c) - p.getZ(a));
        assert.ok(area > 0);
      }
    } finally {
      geometry.dispose();
    }
  }
  for (const a of road)
    for (const b of paving)
      assert.ok(!overlap(a, b), "paving excludes asphalt at every junction");
});
