import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import * as THREE from "three";
import { surfaceTexture } from "./SurfaceTextures";
export function WorldLighting({
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
