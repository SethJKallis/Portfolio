import { zones, type Telemetry, type ZoneId } from "./gameData.ts";

// Free exploration: a district can be approached from any street or green space.
export function nextPortfolioStop(
  position: Pick<Telemetry, "x" | "z">,
  opened: ReadonlySet<ZoneId>,
) {
  return zones.find(
    (zone) =>
      !opened.has(zone.id) &&
      (Math.hypot(zone.x - position.x, zone.z - position.z) < 22 ||
        Math.hypot(
          zone.landmark[0] - position.x,
          zone.landmark[2] - position.z,
        ) < 12),
  );
}
