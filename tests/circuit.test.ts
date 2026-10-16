import { test } from "node:test";
import assert from "node:assert/strict";
import {
  circuitLength,
  nearestTrack,
  raceSpawn,
  trackPoint,
  trackSamples,
  trackWidth,
  circuitBounds,
  mapPosition,
} from "../src/circuit.ts";
import { zones, exhibits } from "../src/gameData.ts";

test("race course is a closed loop with a consistent width and forward-facing starting grid", () => {
  assert.ok(circuitLength > 1200);
  const start = trackPoint(0),
    end = trackPoint(1);
  assert.ok(Math.hypot(start.x - end.x, start.z - end.z) < 1e-6);
  assert.equal(raceSpawn.heading, start.heading);
  for (let i = 0; i < 80; i++) {
    const left = trackPoint(i / 80, -trackWidth / 2),
      right = trackPoint(i / 80, trackWidth / 2);
    assert.ok(
      Math.abs(Math.hypot(left.x - right.x, left.z - right.z) - trackWidth) <
        0.001,
    );
    const p = trackPoint(i / 80);
    assert.ok(nearestTrack(p.x, p.z).distance < 0.8);
    assert.ok(Number.isFinite(p.heading));
  }
});

test("race progress follows the entire loop and off-track distance is detectable", () => {
  trackSamples.forEach((p, i) => {
    const sample = nearestTrack(p.x, p.z);
    assert.ok(sample.distance < 0.001);
    assert.equal(sample.progress, i / trackSamples.length);
  });
  assert.ok(nearestTrack(235, 235).distance > 30);
});
test("the larger technical layout turns in both directions and fits its map", () => {
  assert.ok(circuitBounds.maxX - circuitBounds.minX > 300);
  assert.ok(circuitBounds.maxZ - circuitBounds.minZ > 250);
  let left = 0,
    right = 0;
  trackSamples.forEach((p, i) => {
    const next = trackSamples[(i + 8) % trackSamples.length];
    const bend = Math.atan2(
      Math.sin(next.heading - p.heading),
      Math.cos(next.heading - p.heading),
    );
    if (bend > 0.05) left++;
    if (bend < -0.05) right++;
    const m = mapPosition(p.x, p.z);
    assert.ok(m.x >= 8 && m.x <= 92 && m.z >= 8 && m.z <= 92);
  });
  assert.ok(
    left > 80 && right > 80,
    `left samples ${left}; right samples ${right}`,
  );
  for (let i = 0; i < trackSamples.length; i += 8)
    for (let j = i + 8; j < trackSamples.length; j += 8) {
      const separation =
        (Math.min(j - i, trackSamples.length - j + i) * circuitLength) /
        trackSamples.length;
      if (separation < 50) continue;
      assert.ok(
        Math.hypot(
          trackSamples[i].x - trackSamples[j].x,
          trackSamples[i].z - trackSamples[j].z,
        ) >
          trackWidth + 14,
        "track sections have runoff clearance",
      );
    }
});
test("five portfolio landmarks keep the entire racing lane clear and retain every chapter", () => {
  assert.equal(zones.length, 5);
  for (const zone of zones) {
    const clearance =
      nearestTrack(zone.landmark[0], zone.landmark[2]).distance - 3.5;
    assert.ok(
      clearance > trackWidth / 2 + 2,
      `${zone.id} clears the road and shoulder`,
    );
    assert.ok(
      exhibits.some(
        (entry) => entry.id === zone.firstEntry && entry.zone === zone.id,
      ),
    );
    for (const entry of exhibits.filter((entry) => entry.zone === zone.id)) {
      assert.equal(entry.position[0], zone.landmark[0]);
      assert.equal(entry.position[2], zone.landmark[2]);
      assert.ok(entry.title.length > 0 && entry.text.length > 0);
    }
  }
  assert.equal(exhibits.filter((entry) => entry.zone === "projects").length, 7);
});
