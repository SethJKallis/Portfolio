import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { RoundedBox } from "@react-three/drei";
import { zones, type ZoneId, type Point } from "./gameData";
import { trackPoint } from "./circuit";
function Block({
  p = [0, 0, 0],
  s,
  c,
  rotation = [0, 0, 0],
}: {
  p?: Point;
  s: Point;
  c: string;
  rotation?: Point;
}) {
  return (
    <RoundedBox
      position={p}
      args={s}
      radius={Math.min(0.08, ...s.map((v) => v * 0.2))}
      smoothness={2}
      rotation={rotation}
      castShadow
      receiveShadow
    >
      <meshPhysicalMaterial
        color={c}
        metalness={c === "#d6b874" ? 0.65 : 0.24}
        roughness={0.42}
        clearcoat={0.3}
      />
    </RoundedBox>
  );
}

function Label({ title, color }: { title: string; color: string }) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 768;
    canvas.height = 128;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#183c3d";
    ctx.fillRect(0, 0, 768, 128);
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 9, 128);
    ctx.font = "bold 50px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#f4f2df";
    ctx.fillText(title.toUpperCase(), 390, 65, 700);
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [title, color]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <mesh position={[0, 4.7, 0]}>
      <planeGeometry args={[4.9, 0.82]} />
      <meshBasicMaterial
        map={texture}
        side={THREE.DoubleSide}
        toneMapped={false}
      />
    </mesh>
  );
}

function Sculpture({ kind, color }: { kind: ZoneId; color: string }) {
  const moving = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!moving.current) return;
    moving.current.position.y = Math.sin(clock.elapsedTime * 1.8) * 0.12;
    moving.current.rotation.y = Math.sin(clock.elapsedTime * 0.45) * 0.2;
  });
  return (
    <group ref={moving}>
      {kind === "about" && (
        <>
          <Block p={[0, 0.45, 0]} s={[2.8, 0.9, 2.4]} c="#d6b874" />
          <Block p={[0, 1.3, 0]} s={[1.25, 1.3, 0.9]} c="#ed6946" />
          <mesh position={[0, 2.55, 0]} castShadow>
            <sphereGeometry args={[0.87, 16, 12]} />
            <meshStandardMaterial color="#f1edce" roughness={0.35} />
          </mesh>
          <Block p={[0, 2.6, 0.67]} s={[1.4, 0.38, 0.25]} c="#254e56" />
          <Block p={[0, 3.31, 0]} s={[0.2, 0.05, 1]} c="#ed6946" />
          {[-0.5, -0.25, 0, 0.25, 0.5].map((x) => (
            <Block
              key={x}
              p={[x, 2.6, 0.81]}
              s={[0.06, 0.21, 0.025]}
              c="#355d61"
            />
          ))}
          {[-1, 1].map((side) => (
            <Block
              key={side}
              p={[side * 0.94, 1.45, 0]}
              s={[0.42, 1.1, 0.55]}
              c="#ee7651"
              rotation={[0, 0, side * -0.3]}
            />
          ))}
        </>
      )}
      {kind === "experience" && (
        <>
          {[-1.05, 1.05].map((x) => (
            <group key={x}>
              <Block p={[x, 1.65, 0]} s={[1.3, 3.3, 1.4]} c="#234949" />
              {[0.7, 1.4, 2.1, 2.8].map((y) => (
                <group key={y}>
                  <Block p={[x, y, 0.73]} s={[0.96, 0.3, 0.06]} c="#779e8e" />
                  <mesh position={[x + 0.32, y, 0.78]}>
                    <sphereGeometry args={[0.07, 8, 6]} />
                    <meshBasicMaterial color="#b9f289" />
                  </mesh>
                </group>
              ))}
            </group>
          ))}
          <mesh position={[0, 2.2, 0]} rotation={[0, Math.PI / 2, 0]}>
            <torusGeometry args={[1.15, 0.12, 8, 24]} />
            <meshStandardMaterial
              color="#a3edd1"
              emissive="#47d7ad"
              emissiveIntensity={0.8}
            />
          </mesh>
          {[0, 1, 2].map((i) => (
            <mesh key={i} position={[0, 0.8 + i * 0.8, 0.3]}>
              <octahedronGeometry args={[0.23]} />
              <meshStandardMaterial
                color="#e3ed82"
                emissive="#e3ed82"
                emissiveIntensity={0.5}
              />
            </mesh>
          ))}
          {[-1.05, 1.05].map((x) => (
            <mesh
              key={x}
              position={[x, 3.38, 0]}
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <torusGeometry args={[0.32, 0.045, 8, 20]} />
              <meshStandardMaterial
                color="#516e6b"
                metalness={0.7}
                roughness={0.3}
              />
            </mesh>
          ))}
        </>
      )}
      {kind === "projects" && (
        <>
          <mesh position={[0, 1.85, 0]} castShadow>
            <cylinderGeometry args={[0.58, 0.72, 2.2, 12]} />
            <meshStandardMaterial color="#f3efd7" />
          </mesh>
          <mesh position={[0, 3.4, 0]} castShadow>
            <coneGeometry args={[0.6, 1.1, 12]} />
            <meshStandardMaterial color="#e97052" />
          </mesh>
          <mesh position={[0, 2.1, 0.58]}>
            <sphereGeometry args={[0.28, 12, 8]} />
            <meshStandardMaterial
              color="#427b88"
              metalness={0.4}
              roughness={0.2}
            />
          </mesh>
          {[-1, 1].map((side) => (
            <Block
              key={side}
              p={[side * 0.72, 1.1, 0]}
              s={[0.55, 1.1, 0.6]}
              c="#e87955"
              rotation={[0, 0, side * -0.3]}
            />
          ))}
          <mesh position={[0, 0.45, 0]} rotation={[0, 0, Math.PI]}>
            <coneGeometry args={[0.4, 0.9, 8]} />
            <meshStandardMaterial
              color="#ffe18a"
              emissive="#f3af52"
              emissiveIntensity={1.2}
            />
          </mesh>
          <mesh position={[0, 0.35, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[1.7, 0.07, 8, 32]} />
            <meshBasicMaterial color={color} />
          </mesh>
        </>
      )}
      {kind === "education" && (
        <>
          {[0, 1, 2, 3].map((i) => (
            <group
              key={i}
              position={[0, 0.4 + i * 0.6, 0]}
              rotation={[0, (i % 2 ? 1 : -1) * 0.18, 0]}
            >
              <Block s={[2.7, 0.48, 1.6]} c="#f0ead0" />
              <Block
                p={[0, 0.27, 0]}
                s={[2.85, 0.08, 1.7]}
                c={["#df7455", "#e1bb55", "#72aa97", "#738cbb"][i]}
              />
              <Block
                p={[-1.34, 0, 0]}
                s={[0.16, 0.54, 1.7]}
                c={["#df7455", "#e1bb55", "#72aa97", "#738cbb"][i]}
              />
            </group>
          ))}
          <Block p={[0, 3.1, 0]} s={[1.4, 0.35, 1.4]} c="#234548" />
          <Block
            p={[0, 3.35, 0]}
            s={[2.1, 0.12, 2.1]}
            c="#234548"
            rotation={[0, 0.5, 0]}
          />
          <Block p={[1.05, 3, 0.6]} s={[0.07, 0.65, 0.07]} c="#ead371" />
        </>
      )}
      {kind === "contact" && (
        <>
          <Block p={[0, 1.2, 0]} s={[0.3, 2.4, 0.3]} c="#d6dec2" />
          <Block p={[0, 0.25, 0]} s={[2.1, 0.5, 2.1]} c="#325b5b" />
          <group position={[0, 2.9, 0]} rotation={[-0.65, 0.2, 0]}>
            <mesh castShadow>
              <sphereGeometry
                args={[1.35, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]}
              />
              <meshStandardMaterial color="#ddebd3" side={THREE.DoubleSide} />
            </mesh>
            <Block p={[0, 0.9, 0]} s={[0.08, 1.8, 0.08]} c="#607b78" />
            <mesh position={[0, 1.8, 0]}>
              <sphereGeometry args={[0.18, 10, 8]} />
              <meshBasicMaterial color="#dbea84" />
            </mesh>
          </group>
        </>
      )}
    </group>
  );
}

export function CareerLandmarks({ visited }: { visited: ZoneId[] }) {
  const beacons = useRef<(THREE.Group | null)[]>([]);
  useFrame(({ clock }) =>
    beacons.current.forEach((beacon, i) => {
      if (beacon) {
        beacon.position.y = 2.2 + Math.sin(clock.elapsedTime * 2 + i) * 0.2;
        beacon.rotation.z = clock.elapsedTime * 0.25;
      }
    }),
  );
  return (
    <>
      {zones.map((zone, index) => {
        const passed = visited.includes(zone.id),
          p = trackPoint(zone.progress);
        return (
          <group key={zone.id}>
            <group position={zone.landmark} rotation={[0, zone.rotation, 0]}>
              <RigidBody type="fixed" colliders={false}>
                <CuboidCollider
                  args={[2.2, 0.3, 2.2]}
                  position={[0, 0.25, 0]}
                />
                <CuboidCollider args={[1.45, 1.7, 1.2]} position={[0, 2, 0]} />
              </RigidBody>
              <Block p={[0, 0.15, 0]} s={[4.8, 0.3, 4.8]} c="#294c49" />
              <Block p={[0, 0.32, 0]} s={[4.5, 0.06, 4.5]} c={zone.color} />
              <group position={[0, 0.4, 0]}>
                <Sculpture kind={zone.id} color={zone.color} />
              </group>
              <Label
                title={`${String(index + 1).padStart(2, "0")} / ${zone.name}`}
                color={zone.color}
              />
              <mesh position={[0, 0.02, 1]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[3.5, 3.65, 48]} />
                <meshBasicMaterial
                  color={zone.color}
                  transparent
                  opacity={0.7}
                />
              </mesh>
            </group>
            {!passed && (
              <group position={[p.x, 0, p.z]} rotation={[0, p.heading, 0]}>
                <group
                  ref={(node) => {
                    beacons.current[index] = node;
                  }}
                >
                  <mesh>
                    <torusGeometry args={[1.65, 0.055, 8, 48]} />
                    <meshBasicMaterial
                      color={zone.color}
                      transparent
                      opacity={0.85}
                    />
                  </mesh>
                  <mesh rotation={[0, Math.PI / 4, 0]}>
                    <octahedronGeometry args={[0.36]} />
                    <meshStandardMaterial
                      color="#fff5c5"
                      emissive={zone.color}
                      emissiveIntensity={1.2}
                    />
                  </mesh>
                </group>
              </group>
            )}
          </group>
        );
      })}
    </>
  );
}
