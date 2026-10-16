import { memo, useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import {
  circuitLength,
  trackPoint,
  trackWidth,
  progressDistance,
  tracksidePoint,
  nearestTrack,
} from "./circuit";
import { zones, type Point, type ZoneId } from "./gameData";
import { Block } from "./WorldPrimitives";
import { GroundText } from "./WorldArt";
import { Breakable, type BreakHandler } from "./Destruction";
import { CircuitNature, Instances, Spectators } from "./CircuitNature";
import { CareerLandmarks } from "./CareerLandmarks";
import {
  CircuitDetails,
  CircuitLighting,
  GroundSurface,
} from "./CircuitDetails";
import { surfaceTexture } from "./SurfaceTextures";
import {
  roadSegments,
  trackRibbon,
  kerbRibbon,
  kerbWidth,
} from "./trackGeometry";

function Tarmac() {
  const asphalt = useMemo(() => surfaceTexture("asphalt"), []);
  useEffect(() => () => asphalt.dispose(), [asphalt]);
  const road = useMemo(
    () => trackRibbon(-trackWidth / 2, trackWidth / 2, 0.015),
    [],
  );
  const shoulders = useMemo(
    () => [
      trackRibbon(-trackWidth / 2 - 1.2, -trackWidth / 2 - kerbWidth, 0.005),
      trackRibbon(trackWidth / 2 + kerbWidth, trackWidth / 2 + 1.2, 0.005),
    ],
    [],
  );
  const kerbMeshes = useMemo(() => [kerbRibbon(-1), kerbRibbon(1)], []);
  useEffect(
    () => () => {
      road.dispose();
      shoulders.forEach((geometry) => geometry.dispose());
      kerbMeshes.forEach((geometry) => geometry.dispose());
    },
    [road, shoulders, kerbMeshes],
  );
  const { kerbColliders, lines, rails, posts } = useMemo(() => {
    const kerbColliders = [],
      lines = [],
      rails = [],
      posts = [];
    for (let i = 0; i < roadSegments; i++) {
      if (i % 4 === 0)
        for (const side of [-1, 1]) {
          const p = trackPoint(
            i / roadSegments,
            side * (trackWidth / 2 + 0.35),
          );
          kerbColliders.push({
            x: p.x,
            y: 0.035,
            z: p.z,
            rotation: p.heading,
          });
        }
      if (i % 12 === 0) {
        const p = trackPoint(i / roadSegments);
        for (const side of [-1, 1])
          lines.push({
            x: p.x + p.normal.x * side * 0.22,
            y: 0.025,
            z: p.z + p.normal.z * side * 0.22,
            sx: 0.13,
            sy: 0.012,
            sz: 0.8,
            rotation: p.heading + (side * Math.PI) / 4,
            color: "#c4e8a6",
          });
      }
      if (i % 12 === 0)
        for (const side of [-1, 1]) {
          if (
            zones.some(
              (zone) =>
                Math.sign(zone.offset) === side &&
                progressDistance(zone.progress, i / roadSegments) <
                  12 / circuitLength,
            )
          )
            continue;
          const p = trackPoint(i / roadSegments, side * 18.5);
          const halfLength = circuitLength / (roadSegments / 12) / 2;
          if (
            [-halfLength, 0, halfLength].some(
              (d) =>
                nearestTrack(p.x + p.tangent.x * d, p.z + p.tangent.z * d)
                  .distance <
                trackWidth / 2 + 2,
            )
          )
            continue;
          posts.push({
            x: p.x,
            y: 0.65,
            z: p.z,
            sx: 0.12,
            sy: 1.3,
            sz: 0.12,
            color: "#adb9ad",
          });
          rails.push({
            x: p.x,
            y: 0.55,
            z: p.z,
            sx: 0.16,
            sy: 0.35,
            sz: (circuitLength / (roadSegments / 12)) * 0.97,
            rotation: p.heading,
            color: "#c6d0c0",
          });
        }
    }
    return { kerbColliders, lines, rails, posts };
  }, []);
  return (
    <>
      {shoulders.map((geometry, i) => (
        <mesh key={i} geometry={geometry} receiveShadow>
          <meshStandardMaterial color="#aeb28a" roughness={1} />
        </mesh>
      ))}
      <mesh geometry={road} receiveShadow>
        <meshStandardMaterial
          color="#626b70"
          map={asphalt}
          bumpMap={asphalt}
          bumpScale={0.035}
          roughness={0.87}
        />
      </mesh>
      {kerbMeshes.map((geometry, i) => (
        <mesh key={i} geometry={geometry} receiveShadow>
          <meshStandardMaterial vertexColors roughness={0.94} />
        </mesh>
      ))}
      <Instances items={lines} shadow={false} />
      <Instances items={rails} />
      <Instances items={posts} />
      <RigidBody type="fixed" colliders={false}>
        {kerbColliders.map((p, i) => (
          <CuboidCollider
            key={`kerb-${i}`}
            args={[0.35, 0.06, circuitLength / (roadSegments / 2)]}
            position={[p.x, p.y, p.z]}
            rotation={[0, p.rotation, 0]}
            friction={0.95}
            restitution={0.12}
          />
        ))}
        {rails.map((r, i) => (
          <CuboidCollider
            key={i}
            args={[0.08, 0.175, r.sz / 2]}
            position={[r.x, r.y, r.z]}
            rotation={[0, r.rotation ?? 0, 0]}
          />
        ))}
      </RigidBody>
    </>
  );
}

function Banner({
  text,
  width,
  height = 1.4,
  color = "#e4f084",
  background = "#183c3d",
  p = [0, 0, 0],
}: {
  text: string;
  width: number;
  height?: number;
  color?: string;
  background?: string;
  p?: Point;
}) {
  const texture = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 1600;
    c.height = 230;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, 1600, 230);
    ctx.fillStyle = color;
    ctx.font = "italic 900 130px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.save();
    ctx.translate(800, 120);
    ctx.scale(Math.min(1, 1450 / ctx.measureText(text).width), 1);
    ctx.fillText(text, 0, 0);
    ctx.restore();
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [text, color, background]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <mesh position={p}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial
        map={texture}
        side={THREE.DoubleSide}
        toneMapped={false}
      />
    </mesh>
  );
}
function StartingGrid() {
  const p = trackPoint(0);
  const paint = useMemo(
    () => [
      ...Array.from({ length: 36 }, (_, i) => ({
        x: -8.5 + (i % 18),
        y: 0.024,
        z: -Math.floor(i / 18),
        sx: 1,
        sy: 0.025,
        sz: 1,
        color: (i + Math.floor(i / 18)) % 2 ? "#e8eddb" : "#202c31",
      })),
      ...[0, 1, 2].flatMap((row) =>
        [-1, 1].flatMap((side) => [
          {
            x: side * 3.5,
            y: 0.025,
            z: 4 + row * 5,
            sx: 2.4,
            sy: 0.025,
            sz: 0.1,
            color: "#d3ddc8",
          },
          {
            x: side * 3.5 - 1.2,
            y: 0.025,
            z: 4.6 + row * 5,
            sx: 0.1,
            sy: 0.025,
            sz: 1.2,
            color: "#d3ddc8",
          },
          {
            x: side * 3.5 + 1.2,
            y: 0.025,
            z: 4.6 + row * 5,
            sx: 0.1,
            sy: 0.025,
            sz: 1.2,
            color: "#d3ddc8",
          },
        ]),
      ),
    ],
    [],
  );
  return (
    <group position={[p.x, 0, p.z]} rotation={[0, p.heading, 0]}>
      <Instances items={paint} shadow={false} />
      <RigidBody type="fixed" colliders={false}>
        {[-11, 11].map((x) => (
          <CuboidCollider
            key={x}
            args={[0.25, 4.6, 0.25]}
            position={[x, 4.6, -4.5]}
          />
        ))}
        <CuboidCollider args={[11.5, 0.3, 0.35]} position={[0, 9.1, -4.5]} />
        <Block p={[-11, 4.6, -4.5]} s={[0.45, 9.2, 0.45]} c="#e2e8ca" />
        <Block p={[11, 4.6, -4.5]} s={[0.45, 9.2, 0.45]} c="#e2e8ca" />
        <Block p={[0, 9.1, -4.5]} s={[23, 0.6, 0.7]} c="#183c3d" />
      </RigidBody>
      <Banner
        text="KALLIS GRAND PRIX"
        width={10}
        height={0.7}
        p={[0, 9.1, -4.12]}
      />
      <Banner
        text="DATA · AI · CODE · FULL THROTTLE"
        width={8}
        height={0.55}
        p={[0, 8.3, -4.4]}
        color="#f1eddb"
      />
      {[-1.2, -0.6, 0, 0.6, 1.2].map((x) => (
        <mesh key={x} position={[x, 7.55, -4.4]}>
          <sphereGeometry args={[0.2, 10, 8]} />
          <meshStandardMaterial
            color="#a9d77a"
            emissive="#b9e89b"
            emissiveIntensity={0.8}
          />
        </mesh>
      ))}
      <GroundText
        text="START / FINISH"
        p={[0, 0.04, 2]}
        width={9}
        height={0.7}
        color="#e4edc8"
      />
      <GroundText
        text="SETH KALLIS"
        p={[0, 0.055, 10]}
        width={14}
        height={2.4}
        color="#e4edc8"
      />
      <GroundText
        text="DATA ENGINEERING / AI AUTOMATION"
        p={[0, 0.055, 13]}
        width={14}
        height={0.65}
        color="#d0dcab"
      />
    </group>
  );
}

function Flags() {
  const flags = useRef<(THREE.Group | null)[]>([]);
  useFrame(({ clock }) =>
    flags.current.forEach((flag, i) => {
      if (flag) flag.rotation.y = Math.sin(clock.elapsedTime * 2 + i) * 0.2;
    }),
  );
  return (
    <>
      {Array.from({ length: 36 }, (_, i) => {
        const p = trackPoint(i / 36, -12);
        if (nearestTrack(p.x, p.z).distance < 11) return null;
        return (
          <group key={i} position={[p.x, 0, p.z]} rotation={[0, p.heading, 0]}>
            <Block p={[0, 3, 0]} s={[0.08, 6, 0.08]} c="#d9e6cb" />
            <group
              ref={(node) => {
                flags.current[i] = node;
              }}
              position={[0, 5.4, 0]}
            >
              <Block
                p={[0.65, 0, 0]}
                s={[1.3, 0.85, 0.045]}
                c={i % 2 ? "#e3ed82" : "#e46c4b"}
              />
              <Block
                p={[0.65, 0, 0.03]}
                s={[0.15, 0.75, 0.02]}
                c="#f2efdb"
                rotation={[0, 0, -0.4]}
              />
            </group>
          </group>
        );
      })}
    </>
  );
}

function PlayLane({
  onBreak,
  paused,
}: {
  onBreak: BreakHandler;
  paused: boolean;
}) {
  const tires = useMemo(
    () =>
      Array.from({ length: 22 }, (_, i) => {
        const p = trackPoint(0.12 + i * 0.036, 14);
        return { ...p, layers: i % 3 === 0 ? 3 : 2 };
      }),
    [],
  );
  return (
    <>
      {tires.map((p, i) => (
        <group key={i}>
          {Array.from({ length: p.layers }, (_, row) => (
            <RigidBody
              key={row}
              colliders="hull"
              mass={0.8}
              position={[p.x, 0.24 + row * 0.46, p.z]}
              restitution={0.35}
              friction={0.7}
            >
              <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
                <torusGeometry args={[0.63, 0.22, 6, 12]} />
                <meshStandardMaterial color={i % 4 ? "#263937" : "#e3e8cd"} />
              </mesh>
            </RigidBody>
          ))}
        </group>
      ))}
      {[0.085, 0.24, 0.38, 0.63, 0.74, 0.89].map((t, i) => {
        const p = trackPoint(t, 14);
        return (
          <Breakable
            key={i}
            p={[p.x, 0.84, p.z]}
            material="barrier"
            seed={500 + i}
            onBreak={onBreak}
            paused={paused}
          />
        );
      })}
      {[0.064, 0.18, 0.33, 0.69, 0.86].map((t, i) => {
        const p = trackPoint(t, 14);
        return (
          <Breakable
            key={i}
            p={[p.x, 0.8, p.z]}
            seed={600 + i}
            onBreak={onBreak}
            paused={paused}
          />
        );
      })}
      {[
        { t: 0.49, offset: 13.5, width: 3.8 },
        { t: 0.78, offset: 14, width: 1.15 },
      ].map((r, i) => {
        const p = trackPoint(r.t, r.offset);
        return (
          <group key={i} position={[p.x, 0, p.z]} rotation={[0, p.heading, 0]}>
            <RigidBody
              type="fixed"
              colliders="cuboid"
              position={[0, 1.1, 0]}
              rotation={[0.34, 0, 0]}
            >
              <Block s={[r.width, 0.2, 7]} c="#dda65a" />
              <Block p={[0, 0.11, 0]} s={[0.16, 0.02, 6.8]} c="#ffedba" />
            </RigidBody>
            <GroundText
              text={i ? "ROLL LINE ↑" : "JUMP LINE ↑"}
              p={[0, 0.05, 7]}
              width={5}
              height={0.8}
              color="#efcf72"
            />
          </group>
        );
      })}
    </>
  );
}
function BrakingMarkers() {
  const corners = [
    [132, -90],
    [20, -104],
    [-48, -48],
    [-140, -102],
    [-137, 16],
    [-82, 66],
    [-139, 121],
    [55, 105],
  ];
  return (
    <>
      {corners.flatMap(([x, z], index) => {
        const progress = nearestTrack(x, z).progress;
        const before = trackPoint(progress - 8 / circuitLength),
          after = trackPoint(progress + 8 / circuitLength);
        const direction =
          Math.sign(
            Math.atan2(
              Math.sin(after.heading - before.heading),
              Math.cos(after.heading - before.heading),
            ),
          ) || 1;
        return [100, 50].map((distance) => {
          const p = trackPoint(
            progress - distance / circuitLength,
            direction * 11.6,
          );
          if (nearestTrack(p.x, p.z).distance < 10.5) return null;
          return (
            <group
              key={`${index}-${distance}`}
              position={[p.x, 0, p.z]}
              rotation={[0, p.heading, 0]}
            >
              <Block p={[0, 0.75, 0]} s={[0.09, 1.5, 0.09]} c="#68786c" />
              <Banner
                text={String(distance)}
                width={1.05}
                height={0.75}
                p={[0, 1.4, 0.05]}
                color="#243f40"
                background="#f4f0dc"
              />
            </group>
          );
        });
      })}
    </>
  );
}
function Paddock() {
  const p = tracksidePoint(0.025, 29, 23);
  return (
    <group
      position={[p.x, 0, p.z]}
      rotation={[0, p.heading + (Math.sign(p.offset) * Math.PI) / 2, 0]}
    >
      <mesh
        position={[0, 0.018, -5]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[29, 12]} />
        <meshStandardMaterial color="#717971" roughness={0.95} />
      </mesh>
      {[-8, 0, 8].map((x) => (
        <group key={x}>
          <Block p={[x, 0.03, -7]} s={[5.5, 0.02, 0.1]} c="#e4e4bd" />
          <Block p={[x - 2.75, 0.03, -5]} s={[0.1, 0.02, 4]} c="#e4e4bd" />
          <Block p={[x + 2.75, 0.03, -5]} s={[0.1, 0.02, 4]} c="#e4e4bd" />
          <group position={[x + 2.25, 0, -3]}>
            <Block p={[0, 0.35, 0]} s={[0.38, 0.7, 0.28]} c="#263f42" />
            <Block p={[0, 0.95, 0]} s={[0.55, 0.65, 0.35]} c="#e88250" />
            <Block p={[0, 1.47, 0]} s={[0.35, 0.37, 0.35]} c="#e3b48c" />
            <Block p={[0, 1.7, 0]} s={[0.45, 0.1, 0.4]} c="#203f42" />
            <Block
              p={[-0.34, 1, 0]}
              s={[0.16, 0.55, 0.2]}
              c="#e88250"
              rotation={[0, 0, -0.3]}
            />
            <Block
              p={[0.34, 1, 0]}
              s={[0.16, 0.55, 0.2]}
              c="#e88250"
              rotation={[0, 0, 0.3]}
            />
          </group>
        </group>
      ))}
      <RigidBody type="fixed" colliders="cuboid">
        <Block p={[0, 1.4, 1]} s={[25, 2.8, 5]} c="#d4dfc6" />
        <Block p={[0, 3, 1]} s={[27, 0.25, 6]} c="#1f4446" />
        {[-8, 0, 8].map((x) => (
          <group key={x}>
            <Block p={[x, 1.1, -1.55]} s={[5.7, 2.15, 0.08]} c="#304e4b" />
            <Block p={[x, 1.1, -1.62]} s={[0.12, 2, 0.04]} c="#d8e57b" />
            {[0, 1, 2, 3, 4].map((row) => (
              <Block
                key={row}
                p={[x, 0.35 + row * 0.35, -1.64]}
                s={[5.4, 0.035, 0.025]}
                c="#607c73"
              />
            ))}
            <Block p={[x, 2.3, -1.8]} s={[4.7, 0.08, 0.1]} c="#f5e5ae" />
          </group>
        ))}
      </RigidBody>
      {[-8, 0, 8].map((x, i) => (
        <Banner
          key={x}
          text={`0${i + 1}`}
          width={0.85}
          height={0.5}
          p={[x + 2.6, 2.4, -1.68]}
          color="#203f40"
          background="#e5ebc9"
        />
      ))}
      <Banner
        text="THE PADDOCK / BUILD · TEST · REPEAT"
        width={24}
        height={0.65}
        p={[0, 2.65, -1.6]}
      />
      <GroundText
        text="PIT LANE"
        p={[0, 0.03, -6]}
        width={11}
        height={1.5}
        color="#e8ecc5"
      />
    </group>
  );
}

export function CircuitLandscape({
  onBreak,
  paused,
  visited,
  focus,
}: {
  onBreak: BreakHandler;
  paused: boolean;
  visited: ZoneId[];
  focus: RefObject<{ x: number; z: number }>;
}) {
  return (
    <>
      <StaticScenery focus={focus} />
      <CareerLandmarks visited={visited} />
      <PlayLane onBreak={onBreak} paused={paused} />
    </>
  );
}

const StaticScenery = memo(function StaticScenery({
  focus,
}: {
  focus: RefObject<{ x: number; z: number }>;
}) {
  return (
    <>
      <CircuitLighting focus={focus} />
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider
          args={[270, 0.5, 270]}
          position={[0, -0.55, 0]}
          friction={1}
        />
      </RigidBody>
      <Tarmac />
      <GroundSurface />
      <CircuitDetails />
      <CircuitNature />
      <StartingGrid />
      <Flags />
      <BrakingMarkers />
      {zones.map((zone, i) => {
        const p = trackPoint(zone.progress - 42 / circuitLength);
        return (
          <group
            key={zone.id}
            position={[p.x, 0, p.z]}
            rotation={[0, p.heading, 0]}
          >
            <GroundText
              text={`${String(i + 1).padStart(2, "0")} / ${zone.name.toUpperCase()}`}
              p={[0, 0.048, 0]}
              width={14}
              height={2.2}
              color="#e4edc8"
            />
            <GroundText
              text="CV CHAPTER / OPENS ON APPROACH"
              p={[0, 0.048, 2.5]}
              width={10}
              height={0.65}
              color="#ccdaa9"
            />
          </group>
        );
      })}
      {[0.075, 0.23, 0.47, 0.67, 0.9].map((progress, i) => {
        const p = tracksidePoint(progress, 29, 23);
        return (
          <Spectators
            key={i}
            x={p.x}
            z={p.z}
            rotation={p.heading - (Math.sign(p.offset) * Math.PI) / 2}
          />
        );
      })}
      <Paddock />
      <GroundText
        text="KALLIS MOTOR CIRCUIT"
        p={[80, 0.045, 20]}
        width={32}
        height={4}
        color="#d4df9e"
      />
      <GroundText
        text="A CAREER. A CIRCUIT. YOUR RACING LINE."
        p={[80, 0.045, 26]}
        width={32}
        height={1.2}
        color="#c3d095"
      />
    </>
  );
});
