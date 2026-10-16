import { memo, useEffect, useMemo, type RefObject } from "react";
import {
  CuboidCollider,
  RigidBody,
  TrimeshCollider,
} from "@react-three/rapier";
import { WorldLighting, GroundSurface } from "./WorldLighting";
import {
  TownNature,
  Instances,
  seededRandom,
  type Instance,
} from "./TownNature";
import { TownArchitecture, TownFurniture } from "./TownArchitecture";
import { TownPeople, SquareFountain, MakersPlayground } from "./TownLife";
import { SceneryDestruction } from "./SceneryDestruction";
import { CareerLandmarks } from "./CareerLandmarks";
import { GroundText } from "./WorldArt";
import { surfaceTexture } from "./SurfaceTextures";
import { surfaceCells, surfaceGeometry } from "./townGeometry";
import { streets, roadRects, pavingRects, contains } from "./worldLayout";
import { type ZoneId } from "./gameData";
import { type BreakHandler } from "./Destruction";

function TownStreets() {
  const surfaces = useMemo(() => {
    const road = surfaceGeometry(surfaceCells(roadRects), 0.015);
    const pavement = surfaceGeometry(
      surfaceCells(pavingRects, roadRects),
      0.095,
      true,
    );
    return {
      road,
      pavement,
      vertices: pavement.getAttribute("position").array as Float32Array,
      indices: new Uint32Array(pavement.getIndex()!.array),
    };
  }, []);
  const asphalt = useMemo(() => surfaceTexture("asphalt"), []);
  useEffect(
    () => () => {
      surfaces.road.dispose();
      surfaces.pavement.dispose();
      asphalt.dispose();
    },
    [surfaces, asphalt],
  );
  const paint = useMemo(() => {
    const items: Instance[] = [];
    for (const [i, street] of streets.entries()) {
      const dx = street.to[0] - street.from[0],
        dz = street.to[1] - street.from[1],
        length = Math.hypot(dx, dz),
        horizontal = dz === 0;
      for (let d = 7; d < length - 5; d += 7) {
        const x = street.from[0] + (dx * d) / length,
          z = street.from[1] + (dz * d) / length;
        if (roadRects.some((r, j) => j !== i && contains(r, x, z, 5))) continue;
        items.push({
          x,
          y: 0.029,
          z,
          sx: horizontal ? 2.8 : 0.12,
          sy: 0.012,
          sz: horizontal ? 0.12 : 2.8,
          color: "#e4e1bd",
        });
      }
    }
    for (const [x, z] of [
      [24, 32],
      [24, -40],
      [-56, 32],
    ]) {
      for (const side of [-1, 1])
        for (let i = 0; i < 7; i++)
          items.push({
            x: x - 4.5 + i * 1.5,
            y: 0.03,
            z: z + side * 11.3,
            sx: 0.8,
            sy: 0.015,
            sz: 2.3,
            color: "#eae7cc",
          });
    }
    return items;
  }, []);
  return (
    <>
      <mesh geometry={surfaces.road} receiveShadow>
        <meshStandardMaterial
          color="#657575"
          map={asphalt}
          bumpMap={asphalt}
          bumpScale={0.025}
          roughness={0.93}
        />
      </mesh>
      <mesh geometry={surfaces.pavement} receiveShadow>
        <meshStandardMaterial color="#cfc8a7" roughness={0.96} />
      </mesh>
      <RigidBody type="fixed" colliders={false}>
        <TrimeshCollider
          args={[surfaces.vertices, surfaces.indices]}
          friction={0.9}
        />
      </RigidBody>
      <Instances items={paint} shadow={false} />
      <GroundText
        text="SETH KALLIS"
        p={[24, 0.055, 75]}
        width={10}
        height={1.7}
        color="#e3e6bd"
      />
      <GroundText
        text="TAKE THE SCENIC ROUTE"
        p={[24, 0.055, 78]}
        width={10}
        height={0.7}
        color="#cad6ae"
      />
      <GroundText
        text="SETH’S SQUARE"
        p={[-11, 0.112, 21]}
        width={32}
        height={2.8}
        color="#6d8170"
      />
      <GroundText
        text="DATA STUDIO ↑"
        p={[-56, 0.05, -12]}
        width={10}
        height={1.5}
        color="#e0e6bf"
      />
      <GroundText
        text="MAKERS’ YARD ↑"
        p={[88, 0.05, 24]}
        width={9}
        height={1.4}
        color="#e0e6bf"
      />
      <GroundText
        text="THE LIBRARY ↓"
        p={[-56, 0.05, 48]}
        width={10}
        height={1.5}
        color="#e0e6bf"
      />
      <GroundText
        text="POST OFFICE ↑"
        p={[24, 0.05, -57]}
        width={10}
        height={1.5}
        color="#e0e6bf"
      />
    </>
  );
}

function Backdrop() {
  const hills = useMemo(() => {
    const random = seededRandom(248);
    return Array.from({ length: 30 }, (_, i) => {
      const angle = (i / 30) * Math.PI * 2;
      return {
        x: Math.sin(angle) * (245 + random() * 30),
        y: -4,
        z: Math.cos(angle) * (245 + random() * 30),
        sx: 25 + random() * 25,
        sy: 30 + random() * 38,
        sz: 28 + random() * 30,
        color: ["#8fa68b", "#79977c", "#a3b79a"][i % 3],
      };
    });
  }, []);
  return <Instances items={hills} shape="rock" />;
}

const TownScenery = memo(function TownScenery({
  focus,
  onSelect,
}: {
  focus: RefObject<{ x: number; z: number }>;
  onSelect: (id: string) => void;
}) {
  return (
    <>
      <WorldLighting focus={focus} />
      <GroundSurface />
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider
          args={[270, 0.5, 270]}
          position={[0, -0.55, 0]}
          friction={1}
        />
      </RigidBody>
      <TownStreets />
      <TownArchitecture onSelect={onSelect} />
      <TownFurniture />
      <TownNature />
      <Backdrop />
      <TownPeople />
      <SquareFountain />
    </>
  );
});
export function TownLandscape({
  focus,
  onBreak,
  paused,
  visited,
  onSelect,
}: {
  focus: RefObject<{ x: number; z: number }>;
  onBreak: BreakHandler;
  paused: boolean;
  visited: ZoneId[];
  onSelect: (id: string) => void;
}) {
  return (
    <SceneryDestruction focus={focus} paused={paused} onBreak={onBreak}>
      <TownScenery focus={focus} onSelect={onSelect} />
      <CareerLandmarks visited={visited} />
      <MakersPlayground onBreak={onBreak} paused={paused} />
    </SceneryDestruction>
  );
}
