import type { Point } from "./gameData";
export const palette = {
  sand: "#d6b58b",
  road: "#e5c69a",
  green: "#7b9275",
  ink: "#3d5852",
  white: "#fff0cf",
  orange: "#e67e54",
  wood: "#a67b57",
};
export function Block({
  p = [0, 0, 0],
  s = [1, 1, 1],
  c = palette.white,
  rotation = [0, 0, 0],
}: {
  p?: Point;
  s?: Point;
  c?: string;
  rotation?: Point;
}) {
  return (
    <mesh position={p} rotation={rotation} castShadow receiveShadow>
      <boxGeometry args={s} />
      <meshStandardMaterial color={c} roughness={0.9} />
    </mesh>
  );
}
