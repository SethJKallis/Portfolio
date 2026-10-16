import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import type { DriveInput, Point } from "./gameData";
import { surfaceTexture } from "./SurfaceTextures";
import { wheelLayout, suspension } from "./vehiclePhysics";

function Block({
  p,
  s,
  c,
  rotation = [0, 0, 0],
}: {
  p: Point;
  s: Point;
  c: string;
  rotation?: Point;
}) {
  const glass = ["#183c42", "#74aaa2", "#497d7c"].includes(c);
  return (
    <RoundedBox
      position={p}
      args={s}
      radius={Math.min(0.07, ...s.map((v) => v * 0.24))}
      smoothness={3}
      rotation={rotation}
      castShadow
      receiveShadow
    >
      <meshPhysicalMaterial
        color={c}
        metalness={glass ? 0.16 : 0.45}
        roughness={glass ? 0.08 : 0.28}
        clearcoat={1}
        clearcoatRoughness={0.12}
      />
    </RoundedBox>
  );
}

function RaceNumber() {
  const texture = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 256;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#f0f0d7";
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = "#203a3d";
    ctx.font = "italic 900 176px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("07", 125, 140);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <>
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[side * 0.911, 0.29, 0.05]}
          rotation={[0, (side * Math.PI) / 2, 0]}
        >
          <planeGeometry args={[0.66, 0.4]} />
          <meshBasicMaterial map={texture} toneMapped={false} />
        </mesh>
      ))}
    </>
  );
}
export function RacecarModel({
  visible,
  wheels,
  mounts,
  input,
}: {
  visible: boolean;
  wheels: RefObject<(THREE.Group | null)[]>;
  mounts: RefObject<(THREE.Group | null)[]>;
  input: RefObject<DriveInput>;
}) {
  const brakeLight = useRef<THREE.MeshStandardMaterial>(null);
  const carbon = useMemo(() => {
    const map = surfaceTexture("carbon");
    map.repeat.set(4, 2);
    return map;
  }, []);
  useEffect(() => () => carbon.dispose(), [carbon]);
  useFrame(() => {
    const i = input.current;
    if (brakeLight.current)
      brakeLight.current.emissiveIntensity =
        i.brake ||
        i.throttle < 0 ||
        i.keys.has("s") ||
        i.keys.has("b") ||
        i.keys.has("control")
          ? 3
          : 0.45;
  });
  return (
    <group visible={visible}>
      <Block p={[0, 0.14, 0]} s={[1.82, 0.34, 3.45]} c="#ed603f" />
      <Block
        p={[0, 0.29, -1.03]}
        s={[1.77, 0.18, 1.45]}
        c="#f4784c"
        rotation={[-0.06, 0, 0]}
      />
      <Block p={[0, 0.35, 1.1]} s={[1.8, 0.22, 0.95]} c="#d94e3a" />
      <Block p={[0, 0.51, 0.12]} s={[1.18, 0.53, 1.32]} c="#183c42" />
      <Block p={[0, 0.77, 0.23]} s={[1.22, 0.1, 0.93]} c="#ed6946" />
      <Block
        p={[0, 0.57, -0.58]}
        s={[1.08, 0.38, 0.04]}
        c="#74aaa2"
        rotation={[0.5, 0, 0]}
      />
      <Block
        p={[0, 0.57, 0.82]}
        s={[1.07, 0.31, 0.04]}
        c="#497d7c"
        rotation={[-0.4, 0, 0]}
      />
      <Block
        p={[0, 0.4, -1.1]}
        s={[0.23, 0.025, 1.4]}
        c="#eeeacc"
        rotation={[-0.06, 0, 0]}
      />
      <Block p={[0, 0.83, 0.22]} s={[0.23, 0.025, 0.96]} c="#eeeacc" />
      <Block p={[0, 0.475, 1.15]} s={[0.23, 0.025, 0.7]} c="#eeeacc" />
      <Block p={[0, -0.03, -1.82]} s={[2.08, 0.09, 0.33]} c="#233b3c" />
      <Block p={[0, -0.02, 1.76]} s={[1.94, 0.1, 0.24]} c="#233b3c" />
      {[-1, 1].map((side) => (
        <group key={side}>
          <Block
            p={[side * 0.9, 0.22, -1.08]}
            s={[0.29, 0.4, 0.94]}
            c="#e85a3d"
          />
          <Block
            p={[side * 0.9, 0.24, 1.1]}
            s={[0.32, 0.44, 0.97]}
            c="#da4d35"
          />
          <Block
            p={[side * 0.97, -0.01, 0]}
            s={[0.12, 0.12, 1.4]}
            c="#273f3e"
          />
          <Block
            p={[side * 0.67, 0.59, 0.08]}
            s={[0.06, 0.43, 0.05]}
            c="#e86948"
          />
          <Block
            p={[side * 0.82, 0.53, -0.4]}
            s={[0.26, 0.09, 0.18]}
            c="#e3ec86"
          />
          <Block
            p={[side * 0.61, 0.56, 1.44]}
            s={[0.07, 0.59, 0.12]}
            c="#2a3c3e"
          />
          <Block
            p={[side * 1.03, 0.86, 1.48]}
            s={[0.06, 0.26, 0.51]}
            c="#d9e975"
          />
          <Block
            p={[side * 0.65, 0.22, -1.752]}
            s={[0.36, 0.11, 0.035]}
            c="#f0efce"
          />
          <Block
            p={[side * 0.66, 0.25, 1.76]}
            s={[0.33, 0.07, 0.025]}
            c="#fcb45a"
          />
        </group>
      ))}
      <Block
        p={[0, 0.85, 1.48]}
        s={[2.1, 0.1, 0.5]}
        c="#1f3b3f"
        rotation={[-0.1, 0, 0]}
      />
      <Block p={[0, 0.92, 1.43]} s={[1.8, 0.025, 0.12]} c="#d8e873" />
      <Block p={[0, 0.18, -1.77]} s={[0.66, 0.15, 0.06]} c="#243c3c" />
      <RaceNumber />
      <mesh position={[0, 0.29, 1.775]}>
        <boxGeometry args={[1.44, 0.055, 0.025]} />
        <meshStandardMaterial
          ref={brakeLight}
          color="#ba3024"
          emissive="#ff351e"
          emissiveIntensity={0.45}
          roughness={0.2}
        />
      </mesh>
      <mesh position={[0, 0.915, 1.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2, 0.4]} />
        <meshPhysicalMaterial
          color="#596464"
          map={carbon}
          metalness={0.4}
          roughness={0.3}
          clearcoat={0.8}
        />
      </mesh>
      <mesh position={[0, 0.025, -1.82]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2, 0.28]} />
        <meshPhysicalMaterial
          color="#596464"
          map={carbon}
          metalness={0.4}
          roughness={0.3}
          clearcoat={0.8}
        />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side}>
          {[0, 1, 2].map((i) => (
            <mesh key={i} position={[side * 0.65, 0.18 + i * 0.038, -1.77]}>
              <boxGeometry args={[0.29, 0.015, 0.018]} />
              <meshStandardMaterial
                color="#fff4cf"
                emissive="#ffe8aa"
                emissiveIntensity={1.2}
              />
            </mesh>
          ))}
          <mesh
            position={[side * 0.45, 0.06, 1.83]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <cylinderGeometry args={[0.075, 0.075, 0.15, 16, 1, true]} />
            <meshStandardMaterial
              color="#adb8b4"
              metalness={1}
              roughness={0.2}
              side={THREE.DoubleSide}
            />
          </mesh>
          {[0, 1, 2].map((i) => (
            <Block
              key={i}
              p={[side * 0.65, 0.58, -1.1 + i * 0.09]}
              s={[0.33, 0.025, 0.025]}
              c="#2a4144"
            />
          ))}
        </group>
      ))}
      {[-0.6, -0.3, 0, 0.3, 0.6].map((x) => (
        <Block
          key={x}
          p={[x, -0.015, 1.75]}
          s={[0.025, 0.2, 0.32]}
          c="#233b3d"
        />
      ))}
      <Block
        p={[0, 1.01, 0.4]}
        s={[0.018, 0.3, 0.018]}
        c="#233b3d"
        rotation={[0.15, 0, 0]}
      />
      {wheelLayout.map((p, index) => (
        <group
          key={index}
          position={[p.x, 0, p.z]}
          ref={(el) => {
            mounts.current[index] = el;
          }}
        >
          <Block
            p={[Math.sign(p.x) * 0.16, 0.04, -0.16]}
            s={[0.04, 0.19, 0.1]}
            c="#e65d39"
          />
          <group
            ref={(el) => {
              wheels.current[index] = el;
            }}
          >
            <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
              <cylinderGeometry
                args={[suspension.radius, suspension.radius, 0.37, 40]}
              />
              <meshStandardMaterial color="#172d2d" roughness={0.95} />
            </mesh>
            <mesh
              rotation={[0, 0, Math.PI / 2]}
              position={[Math.sign(p.x) * 0.19, 0, 0]}
            >
              <cylinderGeometry args={[0.25, 0.25, 0.025, 32]} />
              <meshStandardMaterial
                color="#536568"
                metalness={0.85}
                roughness={0.35}
              />
            </mesh>
            <mesh
              rotation={[0, 0, Math.PI / 2]}
              position={[Math.sign(p.x) * 0.21, 0, 0]}
            >
              <cylinderGeometry args={[0.1, 0.1, 0.03, 8]} />
              <meshStandardMaterial color="#e2ed85" />
            </mesh>
            <mesh
              position={[Math.sign(p.x) * 0.205, 0, 0]}
              rotation={[0, Math.PI / 2, 0]}
            >
              <torusGeometry args={[0.325, 0.008, 6, 40]} />
              <meshStandardMaterial color="#dce88b" />
            </mesh>
            <mesh
              position={[Math.sign(p.x) * 0.21, 0, 0]}
              rotation={[0, Math.PI / 2, 0]}
            >
              <torusGeometry args={[0.23, 0.018, 8, 32]} />
              <meshStandardMaterial
                color="#bbc7c5"
                metalness={0.9}
                roughness={0.22}
              />
            </mesh>
            {Array.from({ length: 6 }, (_, i) => {
              const angle = (i * Math.PI) / 3;
              return (
                <Block
                  key={i}
                  p={[
                    Math.sign(p.x) * 0.218,
                    Math.sin(angle) * 0.11,
                    Math.cos(angle) * 0.11,
                  ]}
                  s={[0.025, 0.035, 0.24]}
                  c="#c1ccca"
                  rotation={[-angle, 0, 0]}
                />
              );
            })}
          </group>
        </group>
      ))}
    </group>
  );
}
