import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { Point } from "./gameData";
import { palette } from "./WorldPrimitives";
export function GroundText({
  text,
  p,
  width = 12,
  height = 2,
  color = palette.ink,
  rotation = 0,
}: {
  text: string;
  p: Point;
  width?: number;
  height?: number;
  color?: string;
  rotation?: number;
}) {
  const tex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 1024;
    c.height = 256;
    const ctx = c.getContext("2d")!;
    ctx.scale(0.5, 0.5);
    ctx.fillStyle = color;
    ctx.font = "900 340px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const measured = ctx.measureText(text).width;
    ctx.save();
    ctx.translate(1024, 256);
    ctx.scale(Math.min(1, 1950 / measured), 1);
    ctx.fillText(text, 0, 0);
    ctx.restore();
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [text, color]);
  useEffect(() => () => tex.dispose(), [tex]);
  return (
    <mesh position={p} rotation={[-Math.PI / 2, 0, rotation]}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial
        map={tex}
        transparent
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}
