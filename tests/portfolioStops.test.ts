import { test } from "node:test";
import assert from "node:assert/strict";
import { zones } from "../src/gameData.ts";
import { nextPortfolioStop } from "../src/portfolioStops.ts";

test("every CV chapter opens on approach without pressing a key", () => {
  for (const zone of zones) {
    for (const [dx, dz] of [
      [16, 0],
      [-16, 0],
      [0, 16],
      [0, -16],
    ])
      assert.equal(
        nextPortfolioStop({ x: zone.x + dx, z: zone.z + dz }, new Set())?.id,
        zone.id,
      );
    assert.equal(
      nextPortfolioStop({ x: zone.landmark[0], z: zone.landmark[2] }, new Set())
        ?.id,
      zone.id,
    );
  }
});
test("closing a chapter does not reopen it while the car is still at the stop", () => {
  for (const zone of zones) {
    const opened = new Set([zone.id]);
    const position = { x: zone.x, z: zone.z };
    assert.equal(nextPortfolioStop(position, opened), undefined);
  }
});
test("distant scenery does not trigger a town popup", () => {
  for (const zone of zones) {
    assert.equal(
      nextPortfolioStop({ x: zone.x + 300, z: zone.z + 300 }, new Set()),
      undefined,
    );
  }
});
