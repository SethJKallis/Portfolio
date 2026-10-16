import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import * as THREE from "three";
import {
  circuitLength,
  nearestTrack,
  trackPoint,
  tracksidePoint,
} from "./circuit";
import { Instances, seededRandom } from "./CircuitNature";
import { Block } from "./WorldPrimitives";
import { surfaceTexture } from "./SurfaceTextures";
import { zones } from "./gameData";

export function CircuitLighting({
  focus,
}: {
  focus: RefObject<{ x: number; z: number }>;
}) {
  const sun = useRef<THREE.DirectionalLight>(null);
  const target = useMemo(() => new THREE.Object3D(), []);
  useFrame(() => {
    const p = focus.current;
    if (!sun.current) return;
    sun.current.position.set(p.x - 55, 80, p.z + 35);
    target.position.set(p.x, 0, p.z);
    target.updateMatrixWorld();
  });
  return (
    <>
      <color attach="background" args={["#c1d7d0"]} />
      <fog attach="fog" args={["#c1d7d0", 130, 340]} />
      <ambientLight intensity={0.55} color="#fff1d6" />
      <hemisphereLight args={["#d7e9f0", "#5d7050", 1.05]} />
      <primitive object={target} />
      <directionalLight
        ref={sun}
        target={target}
        position={[-55, 80, 35]}
        intensity={3.1}
        color="#fff0d3"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-45}
        shadow-camera-right={45}
        shadow-camera-top={45}
        shadow-camera-bottom={-45}
        shadow-camera-near={1}
        shadow-camera-far={190}
        shadow-normalBias={0.035}
        shadow-bias={-0.00005}
      />
      <Environment resolution={128} frames={1} environmentIntensity={0.45}>
        <Lightformer
          form="rect"
          intensity={2}
          color="#f6ead6"
          scale={[80, 35, 1]}
          position={[-20, 35, -10]}
          rotation={[Math.PI / 2, 0, 0]}
        />
        <Lightformer
          form="rect"
          intensity={1.5}
          color="#cde1e7"
          scale={[70, 25, 1]}
          position={[20, 20, 30]}
          rotation={[0, Math.PI, 0]}
        />
      </Environment>
    </>
  );
}

export function GroundSurface() {
  const map = useMemo(() => {
    const t = surfaceTexture("grass");
    t.repeat.set(38, 38);
    return t;
  }, []);
  useEffect(() => () => map.dispose(), [map]);
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -0.045, 0]}
      receiveShadow
    >
      <planeGeometry args={[540, 540]} />
      <meshStandardMaterial color="#8ba472" map={map} roughness={1} />
    </mesh>
  );
}

export function CircuitDetails() {
  const { wear, gravel, hills, shrubs } = useMemo(() => {
    const random = seededRandom(219);
    const wear = [],
      gravel = [],
      hills = [],
      shrubs = [];
    for (let i = 0; i < 700; i++) {
      const p = trackPoint(i / 700),
        ahead = trackPoint(i / 700 + 6 / circuitLength);
      const bend = Math.atan2(
        Math.sin(ahead.heading - p.heading),
        Math.cos(ahead.heading - p.heading),
      );
      if (Math.abs(bend) < 0.06) continue;
      for (const offset of [-2.3, -1.2, 1.2, 2.3]) {
        const q = trackPoint(i / 700, offset + Math.sign(bend) * 1.1);
        wear.push({
          x: q.x,
          y: 0.026,
          z: q.z,
          sx: 0.1 + random() * 0.12,
          sy: 0.008,
          sz: 1.2 + random() * 0.8,
          rotation: q.heading,
          color: "#293332",
        });
      }
    }
    for (let i = 0; i < 1800; i++) {
      const p = trackPoint(
        random(),
        (i % 2 ? 1 : -1) * (10.5 + random() * 4.5),
      );
      const s = 0.025 + random() * 0.08;
      gravel.push({
        x: p.x,
        y: 0.025,
        z: p.z,
        sx: s,
        sy: s * 0.5,
        sz: s,
        color: ["#c1b597", "#c9c5ad", "#7f8c78"][i % 3],
      });
    }
    for (let i = 0; i < 36; i++) {
      const angle = (i / 36) * Math.PI * 2;
      const x = Math.cos(angle) * (310 + random() * 30),
        z = Math.sin(angle) * (305 + random() * 40);
      if (nearestTrack(x, z).distance < 55) continue;
      hills.push({
        x,
        y: -5,
        z,
        sx: 25 + random() * 30,
        sy: 28 + random() * 45,
        sz: 25 + random() * 35,
        rotation: random() * 6,
        color: ["#809c7b", "#6f8b71", "#98ad91"][i % 3],
      });
    }
    for (let i = 0; i < 420; i++) {
      const p = tracksidePoint(
        random(),
        (i % 2 ? 1 : -1) * (23 + random() * 18),
        16,
      );
      if (
        zones.some(
          (zone) =>
            Math.hypot(zone.landmark[0] - p.x, zone.landmark[2] - p.z) < 7,
        )
      )
        continue;
      shrubs.push({
        x: p.x,
        y: 0.4,
        z: p.z,
        sx: 0.7 + random() * 1.3,
        sy: 0.6 + random() * 0.8,
        sz: 0.7 + random(),
        color: ["#58805a", "#7a9959", "#a0ad62"][i % 3],
      });
    }
    return { wear, gravel, hills, shrubs };
  }, []);
  return (
    <>
      <Instances items={wear} shadow={false} />
      <Instances items={gravel} shape="rock" shadow={false} />
      <Instances items={hills} shape="rock" />
      <Instances items={shrubs} shape="leaf" spatial />
      {Array.from({ length: 26 }, (_, i) => {
        const p = trackPoint((i + 0.5) / 26, 11.3);
        return (
          <group key={i} position={[p.x, 0, p.z]} rotation={[0, p.heading, 0]}>
            <Block p={[0, 0.58, 0]} s={[0.07, 1.16, 0.07]} c="#728077" />
            <Block p={[0, 1.05, 0]} s={[0.35, 0.4, 0.07]} c="#f3eed9" />
            <Block p={[0, 1.05, 0.041]} s={[0.18, 0.16, 0.02]} c="#e77b4e" />
          </group>
        );
      })}
    </>
  );
}
