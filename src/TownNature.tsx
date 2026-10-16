import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { streets, reservedForTown } from "./worldLayout";
import { zones } from "./gameData";
import { surfaceTexture } from "./SurfaceTextures";

export function seededRandom(seed: number) {
  let state = seed;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}
export { Instances, type Instance } from "./SceneInstances";
import { type Instance } from "./SceneInstances";
import { SceneryBatch, useVegetationDamage } from "./SceneryDestruction";
import { type SceneryProp, type Piece } from "./sceneryPhysics";

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
  const points = useMemo(() => {
    const random = seededRandom(7707),
      color = new THREE.Color(),
      points: {
        x: number;
        y: number;
        z: number;
        sx: number;
        height: number;
        rotation: number;
        lean: number;
        color: string;
      }[] = [];
    for (let i = 0; i < 64000; i++) {
      let x: number, z: number;
      if (i < 44000) {
        const street = streets[i % streets.length],
          t = random();
        const dx = street.to[0] - street.from[0],
          dz = street.to[1] - street.from[1],
          length = Math.hypot(dx, dz);
        const offset =
          (i % 2 ? 1 : -1) * (street.width / 2 + 3 + random() ** 2 * 14);
        x = street.from[0] + dx * t - (dz / length) * offset;
        z = street.from[1] + dz * t + (dx / length) * offset;
      } else {
        x = (random() - 0.5) * 360;
        z = (random() - 0.5) * 360;
      }
      if (reservedForTown(x, z, 0.7)) {
        i--;
        continue;
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
      const height = 0.25 + random() * 0.65;
      const sx = 0.7 + random() * 1.6,
        rotation = random() * Math.PI,
        lean = (random() - 0.5) * 0.25;
      color.setHSL(
        0.22 + random() * 0.08,
        0.32 + random() * 0.25,
        0.24 + random() * 0.22,
      );
      points.push({
        x,
        y: -0.04,
        z,
        sx,
        height,
        rotation,
        lean,
        color: color.getStyle(),
      });
    }

    return points;
  }, []);
  useVegetationDamage(grass, points);
  useEffect(() => {
    if (!grass.current) return;
    const dummy = new THREE.Object3D(),
      color = new THREE.Color();
    points.forEach((p, i) => {
      dummy.position.set(p.x, p.y, p.z);
      dummy.scale.set(p.sx, p.height, 1);
      dummy.rotation.set(0, p.rotation, p.lean);
      dummy.updateMatrix();
      grass.current!.setMatrixAt(i, dummy.matrix);
      grass.current!.setColorAt(i, color.set(p.color));
    });
    grass.current.instanceMatrix.needsUpdate = true;
    grass.current.instanceColor!.needsUpdate = true;
    grass.current.computeBoundingSphere();
  }, [points]);
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

export function TownNature() {
  const bark = useMemo(() => surfaceTexture("bark"), []);
  useEffect(() => () => bark.dispose(), [bark]);
  const forest = useMemo(() => {
    const random = seededRandom(2026),
      trunks: Instance[] = [],
      leaves: Instance[] = [],
      pines: Instance[] = [],
      rocks: Instance[] = [],
      flowers: Instance[] = [];
    const props: SceneryProp[] = [];
    while (trunks.length < 750) {
      const x = (random() - 0.5) * 420,
        z = (random() - 0.5) * 420;
      if (
        reservedForTown(x, z, 5) ||
        zones.some(
          (zone) => Math.hypot(zone.landmark[0] - x, zone.landmark[2] - z) < 10,
        )
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
      const trunk = trunks[trunks.length - 1];
      const treeParts: Piece[] = Array.from({ length: 3 }, (_, i) => ({
        p: [x, ((i + 0.5) * trunk.sy) / 3, z],
        s: [trunk.sx, trunk.sy / 3, trunk.sz],
        color: trunk.color,
      }));
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
        const canopy = (pine ? pines : leaves).at(-1)!;
        treeParts.push({
          p: [canopy.x, canopy.y, canopy.z],
          s: [canopy.sx * 2, canopy.sy * 2, canopy.sz * 2],
          color: canopy.color,
          shape: pine ? "pine" : "leaf",
          rotation: [0, canopy.rotation ?? 0, 0],
        });
      }
      props.push({
        id: "tree-" + trunks.length,
        kind: "tree",
        p: [x, trunk.y, z],
        half: [trunk.sx / 2, trunk.sy / 2, trunk.sz / 2],
        pieces: treeParts,
      });
    }
    for (let i = 0; i < 320; i++) {
      const x = (random() - 0.5) * 320,
        z = (random() - 0.5) * 320;
      if (reservedForTown(x, z, 2)) {
        i--;
        continue;
      }
      const s = 0.3 + random() * 0.8;
      rocks.push({
        x,
        y: s * 0.3,
        z,
        sx: s,
        sy: s * 0.6,
        sz: s * 0.8,
        color: ["#8d9d8d", "#b2bca0", "#657d6b"][i % 3],
      });
      const rock = rocks.at(-1)!;
      props.push({
        id: "rock-" + i,
        kind: "rock",
        p: [x, rock.y, z],
        half: [s * 0.8, s * 0.5, s * 0.65],
        pieces: Array.from({ length: 4 }, (_, j) => ({
          p: [
            x + ((j % 2) - 0.5) * s * 0.8,
            rock.y + (Math.floor(j / 2) - 0.5) * s * 0.4,
            z,
          ],
          s: [s * 0.9, s * 0.65, s * 0.85],
          color: rock.color,
          shape: "rock",
        })),
      });
    }
    for (let i = 0; i < 3400; i++) {
      const street = streets[i % streets.length],
        t = random(),
        dx = street.to[0] - street.from[0],
        dz = street.to[1] - street.from[1],
        length = Math.hypot(dx, dz);
      const offset = (i % 2 ? 1 : -1) * (street.width / 2 + 3.7 + random() * 8);
      const x = street.from[0] + dx * t - (dz / length) * offset,
        z = street.from[1] + dz * t + (dx / length) * offset;
      if (reservedForTown(x, z, 0.5)) {
        i--;
        continue;
      }
      flowers.push({
        x,
        y: 0.22 + random() * 0.15,
        z,
        sx: 0.12,
        sy: 0.09,
        sz: 0.12,
        color: ["#fff3ce", "#e8b4a0", "#f8ce55", "#b4bed9"][i % 4],
      });
    }
    return { props, flowers };
  }, []);
  return (
    <>
      <Grass />
      <SceneryBatch props={forest.props} bark={bark} />
      <FlowerPatch flowers={forest.flowers} />
    </>
  );
}

function FlowerPatch({ flowers }: { flowers: Instance[] }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  useVegetationDamage(mesh, flowers);
  useEffect(() => {
    if (!mesh.current) return;
    const dummy = new THREE.Object3D(),
      color = new THREE.Color();
    flowers.forEach((p, i) => {
      dummy.position.set(p.x, p.y, p.z);
      dummy.scale.set(p.sx, p.sy, p.sz);
      dummy.updateMatrix();
      mesh.current!.setMatrixAt(i, dummy.matrix);
      mesh.current!.setColorAt(i, color.set(p.color));
    });
    mesh.current.instanceMatrix.needsUpdate = true;
    mesh.current.instanceColor!.needsUpdate = true;
    mesh.current.computeBoundingSphere();
  }, [flowers]);
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, flowers.length]}>
      <icosahedronGeometry args={[1, 0]} />
      <meshStandardMaterial roughness={0.95} />
    </instancedMesh>
  );
}
