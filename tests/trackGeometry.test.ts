import { test } from "node:test";
import assert from "node:assert/strict";
import {
  kerbRibbon,
  kerbTop,
  roadSegments,
  trackRibbon,
} from "../src/trackGeometry.ts";
import { trackWidth } from "../src/circuit.ts";

test("both kerbs join every stripe exactly, including the closed-loop seam", () => {
  for (const side of [-1, 1] as const) {
    const geometry = kerbRibbon(side);
    try {
      const p = geometry.getAttribute("position");
      for (let i = 0; i < roadSegments; i++) {
        const start = i * 12,
          next = ((i + 1) % roadSegments) * 12;
        for (const [end, begin] of [
          [start + 2, next],
          [start + 3, next + 1],
        ]) {
          assert.equal(p.getX(end), p.getX(begin));
          assert.equal(p.getY(end), p.getY(begin));
          assert.equal(p.getZ(end), p.getZ(begin));
        }
        for (let j = 0; j < 4; j++)
          assert.equal(p.getY(start + j), Math.fround(kerbTop));
      }
    } finally {
      geometry.dispose();
    }
  }
});

test("road and kerb tops never fold back or form overlapping bow-tie quads in tight corners", () => {
  const geometries = [
    trackRibbon(-trackWidth / 2, trackWidth / 2, 0.015),
    kerbRibbon(-1),
    kerbRibbon(1),
  ];
  try {
    for (const geometry of geometries) {
      const p = geometry.getAttribute("position"),
        index = geometry.getIndex()!;
      for (let i = 0; i < index.count; i += 3) {
        const a = index.getX(i),
          b = index.getX(i + 1),
          c = index.getX(i + 2);
        if (p.getY(a) !== p.getY(b) || p.getY(a) !== p.getY(c)) continue; // vertical side faces
        const areaY =
          (p.getZ(b) - p.getZ(a)) * (p.getX(c) - p.getX(a)) -
          (p.getX(b) - p.getX(a)) * (p.getZ(c) - p.getZ(a));
        assert.ok(
          areaY > 0,
          "every horizontal triangle faces up with positive area",
        );
      }
    }
  } finally {
    geometries.forEach((geometry) => geometry.dispose());
  }
});
