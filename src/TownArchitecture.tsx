import { memo, useEffect, useMemo } from "react";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import {
  buildings,
  buildingRect,
  roadRects,
  contains,
  streets,
} from "./worldLayout";
import { Instances, type Instance } from "./TownNature";
import { SceneryBatch } from "./SceneryDestruction";
import {
  type Piece,
  type SceneryProp,
  type PropKind,
  type Tuple,
} from "./sceneryPhysics";
import { zones } from "./gameData";

function WallSign({
  x,
  y,
  z,
  rotation,
  title,
  subtitle,
  onClick,
}: {
  x: number;
  y: number;
  z: number;
  rotation: number;
  title: string;
  subtitle: string;
  onClick?: () => void;
}) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 768;
    canvas.height = 192;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#204947";
    ctx.fillRect(0, 0, 768, 192);
    ctx.fillStyle = "#e5edb8";
    ctx.font = "bold 61px Arial";
    ctx.textAlign = "center";
    ctx.fillText(title, 384, 83, 710);
    ctx.font = "28px Arial";
    ctx.fillStyle = "#c1d5b9";
    ctx.fillText(subtitle, 384, 139, 710);
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, [title, subtitle]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <mesh
      position={[x, y, z]}
      rotation={[0, rotation, 0]}
      onClick={
        onClick
          ? (e) => {
              e.stopPropagation();
              onClick();
            }
          : undefined
      }
    >
      <planeGeometry args={[8.4, 2.1]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  );
}

export const TownArchitecture = memo(function TownArchitecture({
  onSelect,
}: {
  onSelect: (id: string) => void;
}) {
  const { solids, windows, roofs } = useMemo(() => {
    const solids: Instance[] = [],
      windows: Instance[] = [],
      roofs: Instance[] = [];
    const box = (
      x: number,
      y: number,
      z: number,
      sx: number,
      sy: number,
      sz: number,
      color: string,
    ) => solids.push({ x, y, z, sx, sy, sz, color });
    const pane = (x: number, y: number, z: number, side: boolean) => {
      box(x, y, z, side ? 0.18 : 1.9, 1.7, side ? 1.9 : 0.18, "#eddfbd");
      windows.push({
        x: x + (side ? 0.11 : 0),
        y,
        z: z + (side ? 0 : 0.11),
        sx: side ? 0.12 : 1.55,
        sy: 1.38,
        sz: side ? 1.55 : 0.12,
        color: "#4b7d80",
      });
      box(
        x + (side ? 0.2 : 0),
        y,
        z + (side ? 0 : 0.2),
        side ? 0.06 : 0.07,
        1.4,
        side ? 0.07 : 0.06,
        "#cdd8bf",
      );
    };
    for (const b of buildings) {
      box(b.x, b.h / 2 + 0.1, b.z, b.w, b.h, b.d, b.color);
      box(b.x, 0.4, b.z, b.w + 0.3, 0.6, b.d + 0.3, "#b8b49a");
      box(b.x, b.h + 0.25, b.z, b.w + 0.7, 0.35, b.d + 0.7, b.roof);
      if (b.pitched) {
        roofs.push({
          x: b.x,
          y: b.h + 1.85,
          z: b.z,
          sx: b.w + 0.9,
          sy: 3.2,
          sz: b.d + 0.9,
          rotation: Math.PI / 4,
          color: b.roof,
        });
        box(
          b.x - b.w * 0.24,
          b.h + 2.6,
          b.z + b.d * 0.22,
          1.1,
          2.8,
          1.1,
          "#b49a7b",
        );
      } else {
        box(b.x, b.h + 0.6, b.z, b.w - 1, 0.4, b.d - 1, b.roof);
        for (let i = 0; i < 3; i++)
          windows.push({
            x: b.x - 4 + i * 3,
            y: b.h + 0.85,
            z: b.z - 2,
            sx: 2.2,
            sy: 0.15,
            sz: 3.2,
            color: "#375f72",
          });
        box(b.x + 3, b.h + 1.2, b.z + 3, 2.2, 1.2, 2.3, "#8c9e90");
      }
      for (let floor = 0; floor < Math.floor(b.h / 2.6); floor++) {
        const y = 1.95 + floor * 2.6;
        for (let k = 0; k < Math.floor((b.w - 2) / 3.2); k++) {
          const x = b.x - b.w / 2 + 2.5 + k * 3.2;
          if (floor === 0 && Math.abs(x - b.x) < 1.5) continue;
          pane(x, y, b.z + b.d / 2 + 0.05, false);
          pane(x, y, b.z - b.d / 2 - 0.23, false);
        }
        for (let k = 0; k < Math.floor((b.d - 2) / 3.2); k++) {
          const z = b.z - b.d / 2 + 2.5 + k * 3.2;
          if (floor === 0 && Math.abs(z - b.z) < 1.5) continue;
          pane(b.x + b.w / 2 + 0.05, y, z, true);
          pane(b.x - b.w / 2 - 0.23, y, z, true);
        }
      }
      const front = b.front ?? 0,
        nx = Math.sin(front),
        nz = Math.cos(front),
        side = Math.abs(nx) > 0.5;
      const distance = (side ? b.w : b.d) / 2;
      const x = b.x + nx * (distance + 0.16),
        z = b.z + nz * (distance + 0.16);
      box(x, 1.45, z, side ? 0.16 : 2.2, 2.7, side ? 2.2 : 0.16, "#315b5b");
      box(
        x + nx * 0.1,
        1.25,
        z + nz * 0.1,
        side ? 0.07 : 0.12,
        0.15,
        side ? 0.12 : 0.07,
        "#e8cb81",
      );
      if (b.front !== undefined) {
        const length = (side ? b.d : b.w) - 2;
        for (let i = 0; i < 8; i++) {
          const tangent = -length / 2 + (length * (i + 0.5)) / 8;
          box(
            b.x + nx * (distance + 1.2) + nz * tangent,
            2.95,
            b.z + nz * (distance + 1.2) - nx * tangent,
            side ? 2.4 : length / 8,
            0.18,
            side ? length / 8 : 2.4,
            i % 2 ? "#ecdfbc" : "#cf815c",
          );
        }
      }
    }
    return { solids, windows, roofs };
  }, []);
  return (
    <>
      <Instances items={solids} spatial />
      <Instances items={windows} finish="glass" spatial />
      <Instances items={roofs} shape="roof" spatial />
      <RigidBody type="fixed" colliders={false}>
        {buildings.map((b) => (
          <CuboidCollider
            key={b.id}
            args={[b.w / 2, b.h / 2, b.d / 2]}
            position={[b.x, b.h / 2 + 0.1, b.z]}
            friction={0.7}
          />
        ))}
      </RigidBody>
      {buildings
        .filter((b) => b.front !== undefined)
        .map((b) => {
          const zone = zones.find((zone) => zone.id === b.id),
            front = b.front!,
            side = Math.abs(Math.sin(front)) > 0.5,
            distance = (side ? b.w : b.d) / 2 + 0.28;
          return (
            <WallSign
              key={b.id}
              x={b.x + Math.sin(front) * distance}
              y={4.6}
              z={b.z + Math.cos(front) * distance}
              rotation={front}
              title={zone?.place.toUpperCase() ?? "CORNER CAFÉ"}
              subtitle={
                zone
                  ? `${zone.name.toUpperCase()} / CLICK TO READ`
                  : "COFFEE · CONVERSATION · CURIOSITY"
              }
              onClick={zone ? () => onSelect(zone.firstEntry) : undefined}
            />
          );
        })}
    </>
  );
});

export const TownFurniture = memo(function TownFurniture() {
  const props = useMemo(() => {
    const props: SceneryProp[] = [];
    let serial = 0;
    const box = (
      x: number,
      y: number,
      z: number,
      sx: number,
      sy: number,
      sz: number,
      color: string,
    ): Piece => ({ p: [x, y, z], s: [sx, sy, sz], color });
    const add = (kind: PropKind, p: Tuple, half: Tuple, pieces: Piece[]) =>
      props.push({ id: "fixture-" + serial++, kind, p, half, pieces });
    for (const street of streets) {
      const dx = street.to[0] - street.from[0],
        dz = street.to[1] - street.from[1],
        length = Math.hypot(dx, dz);
      for (let distance = 16; distance < length - 12; distance += 23)
        for (const side of [-1, 1]) {
          const x =
              street.from[0] +
              (dx * distance) / length -
              (dz / length) * side * (street.width / 2 + 1.5),
            z =
              street.from[1] +
              (dz * distance) / length +
              (dx / length) * side * (street.width / 2 + 1.5);
          if (
            roadRects.some((r) => contains(r, x, z, 0.65)) ||
            buildings.some((b) => contains(buildingRect(b), x, z, 1))
          )
            continue;
          if (Math.round(distance + side) % 3 === 0)
            add(
              "planter",
              [x, 1.7, z],
              [0.65, 1.65, 0.65],
              [
                box(x, 0.4, z, 1.25, 0.65, 1.25, "#af8966"),
                box(x, 1.8, z, 0.2, 3, 0.2, "#78674c"),
                {
                  p: [x, 3.5, z],
                  s: [2.7, 3.3, 2.7],
                  color: "#799c64",
                  shape: "leaf",
                },
              ],
            );
          else
            add(
              "lamp",
              [x, 2.6, z],
              [0.2, 2.6, 0.2],
              [
                box(x, 1.3, z, 0.12, 2.6, 0.12, "#35534d"),
                box(x, 3.9, z, 0.12, 2.6, 0.12, "#35534d"),
                box(x, 5.15, z, 1.1, 0.12, 0.12, "#35534d"),
                box(x, 5.05, z, 0.8, 0.18, 0.55, "#f3e5b8"),
              ],
            );
        }
    }
    for (const [x, z] of [
      [-35, 20],
      [-18, 20],
      [-32, 0],
      [5, 22],
      [-89, 61],
      [-68, -78],
      [62, 16],
      [38, -87],
    ])
      add(
        "bench",
        [x, 0.75, z],
        [1.5, 0.75, 0.5],
        [
          box(x, 0.72, z, 3, 0.17, 0.85, "#aa8057"),
          box(x, 1.2, z + 0.4, 3, 0.85, 0.12, "#aa8057"),
          ...[-1, 1].map((side) =>
            box(x + side * 1.1, 0.4, z, 0.15, 0.8, 0.8, "#425c52"),
          ),
        ],
      );
    for (const [x, z] of [
      [-38, 5],
      [-14, 3],
      [11, -1],
      [-89, -53],
      [77, 18],
      [-90, 91],
      [63, -65],
    ])
      add(
        "planter",
        [x, 0.65, z],
        [0.8, 0.65, 0.8],
        [
          box(x, 0.25, z, 1.6, 0.4, 1.6, "#b58461"),
          box(x, 0.65, z, 1.6, 0.35, 1.6, "#b58461"),
          {
            p: [x, 1.2, z],
            s: [2.2, 1.6, 2.2],
            color: "#87a064",
            shape: "leaf",
          },
        ],
      );
    for (const x of [-35, -23]) {
      add(
        "cafe",
        [x, 1.8, 43],
        [1.25, 1.8, 1.25],
        [
          box(x, 0.9, 43, 2.5, 0.15, 2.5, "#b18a61"),
          box(x, 0.45, 43, 0.16, 0.9, 0.16, "#3d5a50"),
          box(x, 2, 43, 0.08, 4, 0.08, "#d6c7a4"),
          {
            p: [x, 3.8, 43],
            s: [5.6, 0.9, 5.6],
            color: "#d4835f",
            shape: "leaf",
          },
        ],
      );
      for (const side of [-1, 1])
        add(
          "cafe",
          [x + side * 1.8, 0.65, 43],
          [0.4, 0.65, 0.5],
          [
            box(x + side * 1.8, 0.55, 43, 0.8, 0.15, 0.9, "#7b9378"),
            box(x + side * 1.8, 1, 43.4, 0.8, 0.9, 0.12, "#7b9378"),
          ],
        );
    }
    return props;
  }, []);
  return <SceneryBatch props={props} />;
});
