import { memo, useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { nearestTrack, trackPoint, trackWidth } from "./circuit";
import { zones } from "./gameData";
import { surfaceTexture } from "./SurfaceTextures";

export function seededRandom(seed: number) {
  let state = seed;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}
type Instance = {
  x: number;
  y: number;
  z: number;
  sx: number;
  sy: number;
  sz: number;
  rotation?: number;
  color: string;
};
type InstanceProps = {
  items: Instance[];
  shape?: "box" | "leaf" | "pine" | "rock";
  shadow?: boolean;
  map?: THREE.Texture;
  spatial?: boolean;
};
export const Instances = memo(function Instances(props: InstanceProps) {
  const batches = useMemo(() => {
    if (!props.spatial) return [props.items];
    const cells = new Map<string, Instance[]>();
    for (const item of props.items) {
      const key = `${Math.floor(item.x / 48)},${Math.floor(item.z / 48)}`;
      const cell = cells.get(key);
      if (cell) cell.push(item);
      else cells.set(key, [item]);
    }
    return [...cells.values()];
  }, [props.items, props.spatial]);
  return (
    <>
      {batches.map((items, i) => (
        <InstanceBatch key={i} {...props} items={items} />
      ))}
    </>
  );
});
const InstanceBatch = memo(function InstanceBatch({
  items,
  shape = "box",
  shadow = true,
  map,
}: InstanceProps) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    if (!mesh.current) return;
    const dummy = new THREE.Object3D(),
      color = new THREE.Color();
    items.forEach((p, i) => {
      dummy.position.set(p.x, p.y, p.z);
      dummy.scale.set(p.sx, p.sy, p.sz);
      dummy.rotation.set(0, p.rotation ?? 0, 0);
      dummy.updateMatrix();
      mesh.current!.setMatrixAt(i, dummy.matrix);
      mesh.current!.setColorAt(i, color.set(p.color));
    });
    mesh.current.instanceMatrix.needsUpdate = true;
    if (mesh.current.instanceColor)
      mesh.current.instanceColor.needsUpdate = true;
    mesh.current.computeBoundingSphere();
  }, [items]);
  return (
    <instancedMesh
      ref={mesh}
      args={[undefined, undefined, items.length]}
      castShadow={shadow}
      receiveShadow
    >
      {shape === "box" ? (
        <boxGeometry />
      ) : shape === "pine" ? (
        <coneGeometry args={[1, 2, 10]} />
      ) : (
        <icosahedronGeometry args={[1, shape === "leaf" ? 1 : 0]} />
      )}
      <meshStandardMaterial
        roughness={0.94}
        flatShading
        map={map}
        bumpMap={map}
        bumpScale={0.04}
      />
    </instancedMesh>
  );
});

function Grass() {
  const grass = useRef<THREE.InstancedMesh>(null),
    time = useMemo(() => ({ value: 0 }), []);
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(
        [-0.09, 0, 0, 0.09, 0, 0, -0.01, 0.7, 0.025, 0.09, 1, 0.09],
        3,
      ),
    );
    g.setIndex([0, 1, 2, 1, 3, 2]);
    g.computeVertexNormals();
    return g;
  }, []);
  const material = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({
      side: THREE.DoubleSide,
      roughness: 1,
      color: "#d0e5a5",
    });
    m.onBeforeCompile = (shader) => {
      shader.uniforms.grassTime = time;
      shader.vertexShader = "uniform float grassTime;\n" + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        transformed.x += sin(grassTime * 1.7 + instanceMatrix[3].x * .4 + instanceMatrix[3].z * .25) * position.y * position.y * .19;`,
      );
    };
    return m;
  }, [time]);
  useEffect(() => {
    const random = seededRandom(7707),
      dummy = new THREE.Object3D(),
      color = new THREE.Color();
    if (!grass.current) return;
    for (let i = 0; i < 64000; i++) {
      let x: number, z: number;
      if (i < 48000) {
        const p = trackPoint(
          random(),
          (random() > 0.5 ? 1 : -1) * (trackWidth / 2 + 2 + random() ** 2 * 16),
        );
        x = p.x;
        z = p.z;
      } else {
        do {
          x = (random() - 0.5) * 470;
          z = (random() - 0.5) * 470;
        } while (nearestTrack(x, z).distance < trackWidth / 2 + 2);
      }
      if (
        zones.some(
          (zone) =>
            Math.hypot(zone.landmark[0] - x, zone.landmark[2] - z) < 6.5,
        )
      ) {
        i--;
        continue;
      }
      dummy.position.set(x, -0.04, z);
      const height = 0.25 + random() * 0.65;
      dummy.scale.set(0.7 + random() * 1.6, height, 1);
      dummy.rotation.set(0, random() * Math.PI, (random() - 0.5) * 0.25);
      dummy.updateMatrix();
      grass.current.setMatrixAt(i, dummy.matrix);
      grass.current.setColorAt(
        i,
        color.setHSL(
          0.22 + random() * 0.08,
          0.32 + random() * 0.25,
          0.24 + random() * 0.22,
        ),
      );
    }
    grass.current.instanceMatrix.needsUpdate = true;
    grass.current.instanceColor!.needsUpdate = true;
    grass.current.computeBoundingSphere();
  }, []);
  useFrame((_, dt) => {
    time.value += dt;
  });
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );
  return (
    <instancedMesh
      ref={grass}
      args={[geometry, material, 64000]}
      receiveShadow
    />
  );
}

export function CircuitNature() {
  const bark = useMemo(() => surfaceTexture("bark"), []);
  useEffect(() => () => bark.dispose(), [bark]);
  const forest = useMemo(() => {
    const random = seededRandom(2026);
    const trunks: Instance[] = [],
      leaves: Instance[] = [],
      pines: Instance[] = [],
      rocks: Instance[] = [],
      flowers: Instance[] = [];
    while (trunks.length < 900) {
      const x = (random() - 0.5) * 470,
        z = (random() - 0.5) * 470;
      if (
        nearestTrack(x, z).distance < trackWidth / 2 + 6 ||
        zones.some(
          (zone) => Math.hypot(zone.landmark[0] - x, zone.landmark[2] - z) < 11,
        ) ||
        (x > 155 && z > -15 && z < 115)
      )
        continue;
      const h = 1 + random() * 1.1;
      trunks.push({
        x,
        y: h * 1.4,
        z,
        sx: 0.35 * h,
        sy: 2.8 * h,
        sz: 0.35 * h,
        color: "#6a6345",
      });
      const pine = random() > 0.42;
      for (let layer = 0; layer < (pine ? 3 : 2); layer++) {
        const radius = h * (pine ? 1.8 - layer * 0.4 : 1.55 - layer * 0.25);
        (pine ? pines : leaves).push({
          x: x + (pine ? 0 : layer * 0.5),
          y: h * (2.4 + layer * 1.05),
          z,
          sx: radius,
          sy: h * (pine ? 1.4 : 1.35),
          sz: radius,
          rotation: random() * 6,
          color: ["#356850", "#4f8053", "#6f9657", "#2d5948"][
            Math.floor(random() * 4)
          ],
        });
      }
    }
    for (let i = 0; i < 320; i++) {
      const p = trackPoint(
        random(),
        (random() > 0.5 ? 1 : -1) * (12 + random() * 14),
      );
      const s = 0.3 + random() * 0.8;
      rocks.push({
        x: p.x,
        y: s * 0.3,
        z: p.z,
        sx: s,
        sy: s * 0.6,
        sz: s * 0.8,
        rotation: random() * 6,
        color: ["#8d9d8d", "#b2bca0", "#657d6b"][i % 3],
      });
    }
    for (let i = 0; i < 3400; i++) {
      const p = trackPoint(random(), (i % 2 ? 1 : -1) * (11 + random() * 8));
      flowers.push({
        x: p.x,
        y: 0.22 + random() * 0.15,
        z: p.z,
        sx: 0.12,
        sy: 0.09,
        sz: 0.12,
        color: ["#fff3ce", "#e8b4a0", "#f8ce55", "#b4bed9"][i % 4],
      });
    }
    return { trunks, leaves, pines, rocks, flowers };
  }, []);
  return (
    <>
      <Grass />
      <Instances items={forest.trunks} map={bark} spatial />
      <Instances items={forest.leaves} shape="leaf" spatial />
      <Instances items={forest.pines} shape="pine" spatial />
      <Instances items={forest.rocks} shape="rock" />
      <Instances items={forest.flowers} shape="rock" shadow={false} />
      <RigidBody type="fixed" colliders={false}>
        {forest.trunks.map((p, i) => (
          <CuboidCollider
            key={i}
            args={[p.sx / 2, p.sy / 2, p.sz / 2]}
            position={[p.x, p.y, p.z]}
          />
        ))}
      </RigidBody>
    </>
  );
}

export function Spectators({
  x,
  z,
  rotation = 0,
}: {
  x: number;
  z: number;
  rotation?: number;
}) {
  const arms = useRef<THREE.InstancedMesh>(null);
  const { bodies, heads, legs, waving } = useMemo(() => {
    const random = seededRandom(Math.abs(Math.round(x * 100 + z))),
      bodies: Instance[] = [],
      heads: Instance[] = [],
      legs: Instance[] = [];
    const waving: {
      x: number;
      y: number;
      z: number;
      phase: number;
      color: string;
    }[] = [];
    for (let row = 0; row < 4; row++)
      for (let col = 0; col < 22; col++) {
        if (random() < 0.12) continue;
        const px = -13 + col * 1.2 + random() * 0.15,
          pz = row * 1.5;
        const py = 0.85 + row * 0.7;
        const shirt = ["#e45f3f", "#e7c95a", "#e8ecdb", "#2c6265", "#7592b5"][
          Math.floor(random() * 5)
        ];
        bodies.push({
          x: px,
          y: py + 0.65,
          z: pz,
          sx: 0.5,
          sy: 0.7,
          sz: 0.35,
          color: shirt,
        });
        heads.push({
          x: px,
          y: py + 1.22,
          z: pz,
          sx: 0.32,
          sy: 0.36,
          sz: 0.32,
          color: ["#b77855", "#eac09b", "#815b47", "#cd9870"][col % 4],
        });
        for (const side of [-1, 1]) {
          legs.push({
            x: px + side * 0.15,
            y: py + 0.12,
            z: pz - 0.07,
            sx: 0.18,
            sy: 0.45,
            sz: 0.22,
            color: "#334846",
          });
          waving.push({
            x: px + side * 0.37,
            y: py + 0.92,
            z: pz,
            phase: random() * 6,
            color: shirt,
          });
        }
      }
    return { bodies, heads, legs, waving };
  }, [x, z]);
  const dummy = useMemo(() => new THREE.Object3D(), []),
    color = useMemo(() => new THREE.Color(), []);
  useFrame(({ clock, camera }) => {
    if (!arms.current) return;
    if (Math.hypot(camera.position.x - x, camera.position.z - z) > 100) return;
    waving.forEach((p, i) => {
      dummy.position.set(
        p.x,
        p.y + Math.sin(clock.elapsedTime * 2.5 + p.phase) * 0.09,
        p.z,
      );
      dummy.rotation.z =
        Math.sin(clock.elapsedTime * 2.5 + p.phase) * 0.7 +
        (i % 2 ? -0.6 : 0.6);
      dummy.scale.set(0.16, 0.65, 0.18);
      dummy.updateMatrix();
      arms.current!.setMatrixAt(i, dummy.matrix);
      arms.current!.setColorAt(i, color.set(p.color));
    });
    arms.current.instanceMatrix.needsUpdate = true;
    if (arms.current.instanceColor)
      arms.current.instanceColor.needsUpdate = true;
  });
  return (
    <group position={[x, 0, z]} rotation={[0, rotation, 0]}>
      <Instances items={bodies} />
      <Instances items={heads} />
      <Instances items={legs} />
      <instancedMesh
        ref={arms}
        args={[undefined, undefined, waving.length]}
        frustumCulled={false}
        castShadow
      >
        <boxGeometry />
        <meshStandardMaterial />
      </instancedMesh>
      <RigidBody type="fixed" colliders={false}>
        {[0, 1, 2, 3].map((row) => (
          <CuboidCollider
            key={row}
            args={[14.5, (0.65 + row * 0.7) / 2, 0.75]}
            position={[0, 0.45 + row * 0.35, row * 1.5]}
          />
        ))}
        <CuboidCollider args={[15.5, 0.1, 1]} position={[0, 5.7, 5]} />
      </RigidBody>
      {[0, 1, 2, 3].map((row) => (
        <mesh
          key={row}
          position={[0, 0.45 + row * 0.35, row * 1.5]}
          receiveShadow
          castShadow
        >
          <boxGeometry args={[29, 0.65 + row * 0.7, 1.5]} />
          <meshStandardMaterial color={row % 2 ? "#8b9c94" : "#a5b2a3"} />
        </mesh>
      ))}
      <mesh position={[0, 5.7, 5]} castShadow>
        <boxGeometry args={[31, 0.2, 2]} />
        <meshStandardMaterial color="#23494b" />
      </mesh>
      {[-14.5, 14.5].map((px) => (
        <mesh key={px} position={[px, 2.8, 4.6]} castShadow>
          <boxGeometry args={[0.22, 5.6, 0.22]} />
          <meshStandardMaterial color="#e3e6c9" />
        </mesh>
      ))}
    </group>
  );
}
