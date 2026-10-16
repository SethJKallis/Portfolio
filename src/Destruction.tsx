import { useMemo, useRef, useState, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import {
  CuboidCollider,
  RigidBody,
  useBeforePhysicsStep,
  type CollisionEnterPayload,
  type RapierRigidBody,
} from "@react-three/rapier";
import { Block } from "./WorldPrimitives";
import {
  impactEnergy,
  makeFragments,
  shouldBreak,
  type BreakMaterial,
  type Fracture,
  type Vector,
} from "./impactMath";
import type { Point } from "./gameData";
import { Euler, Quaternion } from "three";

export type ImpactData = { kind: string; velocity: Vector };
export function useImpactVelocity(
  body: RefObject<RapierRigidBody | null>,
  kind: string,
) {
  const data = useMemo<ImpactData>(
    () => ({ kind, velocity: { x: 0, y: 0, z: 0 } }),
    [kind],
  );
  useBeforePhysicsStep(() => {
    if (body.current?.isValid()) {
      const v = body.current.linvel();
      data.velocity = { x: v.x, y: v.y, z: v.z };
      body.current.userData = data;
    }
  });
  return data;
}
export type BreakKind = BreakMaterial | import("./sceneryPhysics").PropKind;
export type BreakHandler = (kind: BreakKind, speed: number) => void;
const dimensions: Record<BreakMaterial, Point> = {
  crate: [1.5, 1.5, 1.5],
  pot: [1.25, 1.5, 1.25],
  barrier: [3.6, 1.6, 0.35],
};
const colors: Record<BreakMaterial, string> = {
  crate: "#c89b63",
  pot: "#c87e5c",
  barrier: "#e5c88b",
};
function Debris({
  snapshot,
  material,
  paused,
}: {
  snapshot: Fracture;
  material: BreakMaterial;
  paused: boolean;
}) {
  const age = useRef(0),
    [expired, setExpired] = useState(false);
  const fragments = useMemo(() => {
    const s = dimensions[material];
    return makeFragments(snapshot, { x: s[0], y: s[1], z: s[2] });
  }, [snapshot, material]);
  const orientation = useMemo<Point>(() => {
    const q = snapshot.rotation,
      e = new Euler().setFromQuaternion(new Quaternion(q.x, q.y, q.z, q.w));
    return [e.x, e.y, e.z];
  }, [snapshot]);
  useFrame((_, dt) => {
    if (!paused && !expired) {
      age.current += dt;
      if (age.current > 22) setExpired(true);
    }
  });
  if (expired) return null;
  return (
    <>
      {fragments.map((f, i) => (
        <Fragment
          key={i}
          position={[f.position.x, f.position.y, f.position.z]}
          velocity={[f.velocity.x, f.velocity.y, f.velocity.z]}
          spin={[f.spin.x, f.spin.y, f.spin.z]}
          size={[f.size.x, f.size.y, f.size.z]}
          mass={f.mass}
          rotation={orientation}
          color={i % 3 === 0 ? "#eed4a3" : colors[material]}
        />
      ))}
    </>
  );
}
function Fragment({
  position,
  velocity,
  spin,
  size,
  mass,
  color,
  rotation,
}: {
  position: Point;
  velocity: Point;
  spin: Point;
  size: Point;
  mass: number;
  color: string;
  rotation: Point;
}) {
  const body = useRef<RapierRigidBody>(null),
    data = useImpactVelocity(body, "debris");
  return (
    <RigidBody
      ref={body}
      position={position}
      rotation={rotation}
      linearVelocity={velocity}
      angularVelocity={spin}
      colliders={false}
      linearDamping={0.12}
      angularDamping={0.4}
      restitution={0.28}
      friction={0.6}
      ccd
      userData={data}
    >
      <CuboidCollider
        args={[size[0] / 2, size[1] / 2, size[2] / 2]}
        mass={mass}
      />
      <Block s={size} c={color} />
    </RigidBody>
  );
}
export function Breakable({
  p,
  material = "crate",
  seed = 1,
  onBreak,
  paused,
}: {
  p: Point;
  material?: BreakMaterial;
  seed?: number;
  onBreak: BreakHandler;
  paused: boolean;
}) {
  const body = useRef<RapierRigidBody>(null),
    data = useImpactVelocity(body, material),
    fractured = useRef(false);
  const [snapshot, setSnapshot] = useState<Fracture | null>(null);
  const s = dimensions[material],
    mass = material === "crate" ? 1.2 : material === "pot" ? 0.75 : 1.0;
  function collision(event: CollisionEnterPayload) {
    const b = body.current;
    if (!b || fractured.current || !b.isValid()) return;
    const other = event.other.rigidBody?.isValid()
        ? event.other.rigidBody
        : undefined,
      otherData = other?.userData as ImpactData | undefined;
    const otherVelocity = otherData?.velocity ||
      other?.linvel() || { x: 0, y: 0, z: 0 };
    const normal = event.manifold.normal(),
      own = data.velocity;
    const energy = impactEnergy(
      own,
      otherVelocity,
      normal,
      mass,
      other?.isDynamic() ? other.mass() : Infinity,
    );
    if (!shouldBreak(material, energy)) return;
    fractured.current = true;
    const pos = b.translation(),
      q = b.rotation(),
      speed = Math.hypot(
        otherVelocity.x - own.x,
        otherVelocity.y - own.y,
        otherVelocity.z - own.z,
      );
    const result: Fracture = {
      position: { ...pos },
      rotation: { ...q },
      velocity: { ...own },
      incoming: {
        x: otherVelocity.x - own.x,
        y: otherVelocity.y - own.y,
        z: otherVelocity.z - own.z,
      },
      speed,
      mass,
      seed,
    };
    // Remove the intact collider before fragments enter the next physics step.
    b.setEnabled(false);
    setSnapshot(result);
    onBreak(material, speed);
  }
  if (snapshot)
    return <Debris snapshot={snapshot} material={material} paused={paused} />;
  return (
    <RigidBody
      ref={body}
      position={p}
      colliders={false}
      restitution={0.15}
      friction={0.6}
      angularDamping={0.18}
      onCollisionEnter={collision}
      userData={data}
      ccd
    >
      <CuboidCollider args={[s[0] / 2, s[1] / 2, s[2] / 2]} mass={mass} />
      {material === "pot" ? (
        <>
          <mesh castShadow>
            <cylinderGeometry args={[0.63, 0.42, 1.5, 8]} />
            <meshStandardMaterial color={colors.pot} />
          </mesh>
          <mesh position={[0, 0.76, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.4, 0.64, 8]} />
            <meshStandardMaterial color="#e3aa7a" />
          </mesh>
          <Block p={[0, 0.74, 0]} s={[0.78, 0.08, 0.78]} c="#766c47" />
        </>
      ) : material === "barrier" ? (
        <>
          <Block s={s} c="#f0d6a5" />
          {[-1.2, 0, 1.2].map((x) => (
            <Block
              key={x}
              p={[x, 0, 0.2]}
              s={[0.35, 1.65, 0.05]}
              c="#d98059"
              rotation={[0, 0, -0.35]}
            />
          ))}
          <Block p={[-1.2, -0.7, 0]} s={[0.3, 0.2, 1.2]} c="#6a7f64" />
          <Block p={[1.2, -0.7, 0]} s={[0.3, 0.2, 1.2]} c="#6a7f64" />
        </>
      ) : (
        <>
          <Block s={s} c={colors.crate} />
          {[-0.62, 0.62].map((x) => (
            <Block key={x} p={[x, 0, 0.77]} s={[0.13, 1.5, 0.09]} c="#e8c68d" />
          ))}
          <Block
            p={[0, 0, 0.79]}
            s={[1.8, 0.12, 0.07]}
            rotation={[0, 0, 0.7]}
            c="#edcb93"
          />
          <Block
            p={[0, 0, -0.77]}
            s={[1.8, 0.12, 0.07]}
            rotation={[0, 0, -0.7]}
            c="#edcb93"
          />
        </>
      )}
    </RigidBody>
  );
}
