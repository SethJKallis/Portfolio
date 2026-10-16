import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import {
  RigidBody,
  useBeforePhysicsStep,
  type RapierRigidBody,
} from "@react-three/rapier";
import * as THREE from "three";
import { seededRandom } from "./TownNature";
import { Block } from "./WorldPrimitives";
import { GroundText } from "./WorldArt";
import {
  DestructibleAssembly,
  NpcCollider,
  useSceneryDestruction,
} from "./SceneryDestruction";
import { type Piece } from "./sceneryPhysics";
import { Breakable, type BreakHandler } from "./Destruction";

export function TownPeople() {
  const [removed, setRemoved] = useState<ReadonlySet<number>>(() => new Set());
  const mesh = useRef<THREE.InstancedMesh>(null),
    bodies = useRef<(RapierRigidBody | null)[]>([]),
    broken = useRef(new Set<number>()),
    time = useRef(0),
    dummy = useMemo(() => new THREE.Object3D(), []),
    { emit, impact: impactFor } = useSceneryDestruction();
  const people = useMemo(() => {
    const points = [
      ...[-83, -57, -20, 1, 19, 53, 76, 97].map((z) => [15.8, z]),
      ...[-85, -60, -20, 1, 48, 70, 97].map((z) => [-64, z]),
      [-36, 9],
      [-21, 18],
      [-9, 6],
      [2, 20],
      [-85, -54],
      [-69, -63],
      [64, 16],
      [78, 18],
      [-90, 65],
      [-69, 59],
      [38, -66],
      [63, -87],
      [-35, 45],
      [-23, 44],
      [97, 7],
      [78, 56],
      [30, 104],
    ];
    const random = seededRandom(582);
    return points.map(([x, z], i) => ({
      x,
      z,
      phase: random() * 6,
      color: ["#d8845f", "#7fa19a", "#dfbd6c", "#c5cbb0", "#6f8f9f"][i % 5],
      skin: ["#d8ad87", "#b98161", "#8e654c"][i % 3],
    }));
  }, []);

  const blocks = useMemo(
    () =>
      people.map(
        (p) =>
          [
            { p: [0, 1.62, 0], s: [0.4, 0.42, 0.4], color: p.skin },
            { p: [0, 1.06, 0], s: [0.64, 0.69, 0.38], color: p.color },
            { p: [-0.17, 0.4, 0], s: [0.22, 0.8, 0.25], color: "#355259" },
            { p: [0.17, 0.4, 0], s: [0.22, 0.8, 0.25], color: "#355259" },
            { p: [-0.43, 1.1, 0], s: [0.17, 0.65, 0.24], color: p.color },
            { p: [0.43, 1.1, 0], s: [0.17, 0.65, 0.24], color: p.color },
            { p: [0, 1.87, 0], s: [0.46, 0.12, 0.45], color: p.color },
          ] as Piece[],
      ),
    [people],
  );
  const limbAngle = (part: number, step: number) =>
    part === 2
      ? step * 0.2
      : part === 3
        ? -step * 0.2
        : part === 4
          ? step * 0.12
          : part === 5
            ? -step * 0.12
            : 0;
  const parts = (i: number): Piece[] => {
    const p = people[i],
      position = bodies.current[i]?.translation() ?? {
        x: p.x,
        y: 0.095,
        z: p.z,
      },
      step = Math.sin(time.current * 4 + p.phase);
    return blocks[i].map((part, j) => ({
      ...part,
      p: [
        part.p[0] + position.x,
        part.p[1] + position.y,
        part.p[2] + position.z,
      ],
      rotation: [limbAngle(j, step), 0, 0],
    }));
  };
  useBeforePhysicsStep(() => {
    time.current += 1 / 60;
    people.forEach((p, i) => {
      if (!broken.current.has(i))
        bodies.current[i]?.setNextKinematicTranslation({
          x: p.x,
          y: 0.095,
          z: p.z + Math.sin(time.current * 0.35 + p.phase) * 0.8,
        });
    });
  });
  useEffect(() => {
    if (!mesh.current) return;
    const color = new THREE.Color();
    people.forEach((p, i) => {
      for (let part = 0; part < 7; part++)
        mesh.current!.setColorAt(
          i * 7 + part,
          color.set(
            part === 0
              ? p.skin
              : part === 2 || part === 3
                ? "#355259"
                : p.color,
          ),
        );
    });
    mesh.current.instanceColor!.needsUpdate = true;
  }, [people]);
  useFrame(() => {
    if (!mesh.current) return;
    people.forEach((_, i) => {
      if (broken.current.has(i)) {
        dummy.scale.setScalar(0);
        dummy.updateMatrix();
        for (let part = 0; part < 7; part++)
          mesh.current!.setMatrixAt(i * 7 + part, dummy.matrix);
        return;
      }
      const position = bodies.current[i]?.translation();
      if (!position) return;
      const step = Math.sin(time.current * 4 + people[i].phase);
      blocks[i].forEach((piece, part) => {
        dummy.position.set(
          position.x + piece.p[0],
          position.y + piece.p[1],
          position.z + piece.p[2],
        );
        dummy.scale.set(...piece.s);
        dummy.rotation.set(limbAngle(part, step), 0, 0);
        dummy.updateMatrix();
        mesh.current!.setMatrixAt(i * 7 + part, dummy.matrix);
      });
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <>
      <instancedMesh
        ref={mesh}
        args={[undefined, undefined, people.length * 7]}
        frustumCulled={false}
        castShadow
        receiveShadow
      >
        <boxGeometry />
        <meshStandardMaterial roughness={0.9} />
      </instancedMesh>
      {people.map((p, i) =>
        removed.has(i) ? null : (
          <RigidBody
            key={i}
            ref={(body) => {
              bodies.current[i] = body;
            }}
            type="kinematicPosition"
            position={[p.x, 0.095, p.z + Math.sin(p.phase) * 0.8]}
            colliders={false}
            onCollisionEnter={(event) => {
              if (broken.current.has(i)) return;
              const impact = impactFor(
                event,
                "npc",
                bodies.current[i]?.linvel(),
              );
              if (!impact) return;
              broken.current.add(i);
              const pieces = parts(i);
              event.target.collider?.setEnabled(false);
              bodies.current[i]?.setEnabled(false);
              setRemoved(new Set(broken.current));
              emit(pieces, "npc", impact);
            }}
          >
            <NpcCollider />
          </RigidBody>
        ),
      )}
    </>
  );
}

export function SquareFountain() {
  const rings = useRef<(THREE.Mesh | null)[]>([]);
  useFrame(({ clock }) =>
    rings.current.forEach((ring, i) => {
      if (ring)
        ring.scale.setScalar(1 + Math.sin(clock.elapsedTime * 1.5 + i) * 0.12);
    }),
  );
  return (
    <group position={[-28, 0, 10]}>
      <DestructibleAssembly
        kind="fountain"
        half={[3.3, 1.3, 3.3]}
        center={[0, 1.3, 0]}
      >
        <mesh position={[0, 0.45, 0]} receiveShadow castShadow>
          <cylinderGeometry args={[3.2, 3.4, 0.7, 32]} />
          <meshStandardMaterial color="#c2c4aa" />
        </mesh>
        <mesh position={[0, 0.82, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[2.9, 32]} />
          <meshPhysicalMaterial
            color="#78aeb0"
            metalness={0.25}
            roughness={0.2}
          />
        </mesh>
        <mesh position={[0, 1.6, 0]} castShadow>
          <cylinderGeometry args={[0.25, 0.55, 1.7, 16]} />
          <meshStandardMaterial color="#e1d9ba" />
        </mesh>
        <mesh position={[0, 2.35, 0]} castShadow>
          <cylinderGeometry args={[1.3, 0.7, 0.25, 24]} />
          <meshStandardMaterial color="#cbd0b4" />
        </mesh>
        <mesh position={[0, 1.6, 0]}>
          <cylinderGeometry args={[1.2, 1.6, 1.3, 24, 1, true]} />
          <meshStandardMaterial
            color="#b3ded2"
            transparent
            opacity={0.4}
            side={THREE.DoubleSide}
          />
        </mesh>
        {[1.5, 2.3].map((radius, i) => (
          <mesh
            key={i}
            ref={(node) => {
              rings.current[i] = node;
            }}
            position={[0, 0.84, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <torusGeometry args={[radius, 0.025, 5, 32]} />
            <meshBasicMaterial color="#d6ece0" transparent opacity={0.65} />
          </mesh>
        ))}
      </DestructibleAssembly>
    </group>
  );
}

export function MakersPlayground({
  onBreak,
  paused,
}: {
  onBreak: BreakHandler;
  paused: boolean;
}) {
  const tires = useMemo(
    () =>
      Array.from({ length: 8 }, (_, i) => ({
        x: 37 + i * 5,
        z: i % 2 ? 127 : 101,
      })),
    [],
  );
  return (
    <>
      <GroundText
        text="THE PLAY YARD"
        p={[55, 0.11, 118]}
        width={20}
        height={2}
        color="#536b5d"
      />
      <GroundText
        text="A LITTLE ROOM TO EXPERIMENT"
        p={[55, 0.11, 128]}
        width={24}
        height={0.9}
        color="#73836a"
      />
      {[
        [45, 4.5],
        [65, 1.15],
      ].map(([x, width], i) => (
        <group key={x} position={[x, 0, 123]}>
          <group position={[0, 1.1, 0]} rotation={[0.34, 0, 0]}>
            <DestructibleAssembly kind="ramp" half={[width / 2, 0.1, 3.5]}>
              <Block s={[width, 0.2, 7]} c={i ? "#90a9a0" : "#cf9a62"} />
              <Block p={[0, 0.11, 0]} s={[0.15, 0.02, 6.8]} c="#efe2b5" />
            </DestructibleAssembly>
          </group>
        </group>
      ))}
      {[
        [42, 0.8, 102],
        [49, 0.8, 102],
        [59, 0.8, 118],
        [73, 0.8, 127],
        [-93, 0.8, -65],
        [64, 0.8, 19],
      ].map((p, i) => (
        <Breakable
          key={i}
          p={p as [number, number, number]}
          seed={200 + i}
          onBreak={onBreak}
          paused={paused}
        />
      ))}
      {[
        [-41, 0.85, 44],
        [-89, 0.85, 58],
        [63, 0.85, -63],
      ].map((p, i) => (
        <Breakable
          key={i}
          p={p as [number, number, number]}
          seed={300 + i}
          material="pot"
          onBreak={onBreak}
          paused={paused}
        />
      ))}
      {tires.map((p, i) => (
        <group key={i}>
          {[0, 1].map((row) => (
            <group key={row} position={[p.x, 0.34 + row * 0.46, p.z]}>
              <DestructibleAssembly
                kind="tire"
                half={[0.85, 0.22, 0.85]}
                dynamic
              >
                <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
                  <torusGeometry args={[0.63, 0.22, 6, 12]} />
                  <meshStandardMaterial color={i % 3 ? "#2b4442" : "#d5d8bb"} />
                </mesh>
              </DestructibleAssembly>
            </group>
          ))}
        </group>
      ))}
    </>
  );
}
