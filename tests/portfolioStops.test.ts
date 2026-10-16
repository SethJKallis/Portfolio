import { test } from "node:test";
import assert from "node:assert/strict";
import { zones } from "../src/gameData.ts";
import { trackPoint, circuitLength } from "../src/circuit.ts";
import { nextPortfolioStop } from "../src/portfolioStops.ts";

test("every CV chapter opens on approach without pressing a key", () => {
  for (const zone of zones) {
    const p = trackPoint(zone.progress - 20 / circuitLength);
    assert.equal(
      nextPortfolioStop(
        { ...p, progress: zone.progress - 20 / circuitLength },
        new Set(),
      )?.id,
      zone.id,
    );
    assert.equal(
      nextPortfolioStop(
        { x: zone.landmark[0], z: zone.landmark[2], progress: 0.99 },
        new Set(),
      )?.id,
      zone.id,
    );
  }
});
test("closing a chapter does not reopen it while the car is still at the stop", () => {
  for (const zone of zones) {
    const opened = new Set([zone.id]);
    const position = { x: zone.x, z: zone.z, progress: zone.progress };
    assert.equal(nextPortfolioStop(position, opened), undefined);
  }
});
test("lap progress alone and distant scenery do not trigger a popup", () => {
  for (const zone of zones) {
    assert.equal(
      nextPortfolioStop(
        { x: zone.x + 100, z: zone.z + 100, progress: zone.progress },
        new Set(),
      ),
      undefined,
    );
    assert.equal(
      nextPortfolioStop(
        { x: zone.x, z: zone.z, progress: (zone.progress + 0.4) % 1 },
        new Set(),
      ),
      undefined,
    );
  }
});
