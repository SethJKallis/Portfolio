import { zones, type Telemetry, type ZoneId } from "./gameData.ts";
import { progressDistance } from "./circuit.ts";

// Chapter stops are detected from the actual car position, never just lap progress.
export function nextPortfolioStop(
  position: Pick<Telemetry, "x" | "z" | "progress">,
  opened: ReadonlySet<ZoneId>,
) {
  return zones.find(
    (zone) =>
      !opened.has(zone.id) &&
      ((progressDistance(zone.progress, position.progress) < 0.035 &&
        Math.hypot(zone.x - position.x, zone.z - position.z) < 28) ||
        Math.hypot(
          zone.landmark[0] - position.x,
          zone.landmark[2] - position.z,
        ) < 9),
  );
}
