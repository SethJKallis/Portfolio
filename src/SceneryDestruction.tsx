import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { useFrame } from "@react-three/fiber";
import {
  CuboidCollider,
  CylinderCollider,
  RigidBody,
  CapsuleCollider,
  useRapier,
  useBeforePhysicsStep,
  useFilterContactPair,
  type CollisionEnterPayload,
  type RapierCollider,
  type RapierRigidBody,
} from "@react-three/rapier";
import * as THREE from "three";
import { Instances, type Instance } from "./SceneInstances";
import {
  useImpactVelocity,
  type ImpactData,
  type BreakHandler,
} from "./Destruction";
import {
  limitDebris,
  makeSceneryFragments,
  sceneryImpact,
  sceneryMaterials,
  SCENERY_DEBRIS_SECONDS,
  vegetationCell,
  type Piece,
  type PropKind,
  type SceneryImpact,
  type SceneryProp,
  type Tuple,
} from "./sceneryPhysics";
import {
  LIGHT_PROPS,
  DEBRIS_CAR_GRACE,
  contactPairKey,
  planYieldingContacts,
  propContactResponse,
  setWheelSupport,
  type YieldingCollider,
} from "./propCollisions";

type Fragment = ReturnType<typeof makeSceneryFragments>[number] & {
  id: number;
  expires: number;
};
type Destruction = {
  emit: (pieces: Piece[], kind: PropKind, impact: SceneryImpact) => void;
  focus: RefObject<{ x: number; z: number }>;
  yielding: Map<number, YieldingCollider>;
  grace: Map<number, { collider: RapierCollider; until: number }>;
  physicsTime: RefObject<number>;
  impact: typeof collisionImpact;
};
const Context = createContext<Destruction | null>(null);
export function useSceneryDestruction() {
  const value = useContext(Context);
  if (!value) throw new Error("Missing scenery physics");
  return value;
}
export function collisionImpact(
  event: CollisionEnterPayload,
  kind: PropKind,
  own = { x: 0, y: 0, z: 0 },
  allowFixed = false,
) {
  const other = event.other.rigidBody;
  if (!other?.isValid() || (other.isFixed() && !allowFixed)) return null;
  const data = other.userData as ImpactData | undefined;
  return sceneryImpact(
    kind,
    own,
    data?.velocity ?? other.linvel(),
    event.manifold.normal(),
    other.isDynamic() ? other.mass() : Infinity,
  );
}
export function SceneryDestruction({
  children,
  focus,
  paused,
  onBreak,
}: {
  children: ReactNode;
  focus: RefObject<{ x: number; z: number }>;
  paused: boolean;
  onBreak: BreakHandler;
}) {
  const { world } = useRapier();
  const yielding = useRef(new Map<number, YieldingCollider>()),
    grace = useRef(
      new Map<number, { collider: RapierCollider; until: number }>(),
    ),
    physicsTime = useRef(0),
    vehicles = useRef(new Map<number, RapierRigidBody>()),
    planned = useRef(new Map<string, SceneryImpact>());
  useBeforePhysicsStep(() => {
    physicsTime.current += 1 / 60;
    if (!vehicles.current.size)
      world.forEachRigidBody((body) => {
        if ((body.userData as ImpactData | undefined)?.kind === "vehicle")
          vehicles.current.set(body.handle, body);
      });
    planned.current = planYieldingContacts(
      yielding.current.values(),
      vehicles.current.values(),
    );
    for (const [handle, entry] of grace.current)
      if (entry.until <= physicsTime.current) {
        if (entry.collider.isValid()) entry.collider.setActiveHooks(0);
        setWheelSupport(entry.collider, true);
        grace.current.delete(handle);
      }
  });
  useFilterContactPair((a, b, bodyA, bodyB) => {
    return propContactResponse(
      a,
      b,
      bodyA,
      bodyB,
      planned.current,
      grace.current,
      vehicles.current,
    );
  });
  const impact = useCallback<typeof collisionImpact>(
    (event, kind, own, allowFixed) =>
      planned.current.get(
        contactPairKey(
          event.target.collider.handle,
          event.other.collider.handle,
        ),
      ) ?? collisionImpact(event, kind, own, allowFixed),
    [],
  );
  const [fragments, setFragments] = useState<Fragment[]>([]),
    age = useRef(0),
    serial = useRef(0),
    nextSweep = useRef(1),
    lastSound = useRef(-1);
  useFrame((_, dt) => {
    if (paused) return;
    age.current += dt;
    if (age.current > nextSweep.current) {
      nextSweep.current = age.current + 1;
      setFragments((old) =>
        old.some((f) => f.expires < age.current)
          ? old.filter((f) => f.expires >= age.current)
          : old,
      );
    }
  });
  const emit = useCallback(
    (pieces: Piece[], kind: PropKind, impact: SceneryImpact) => {
      const added = makeSceneryFragments(pieces, kind, impact).map((f) => ({
        ...f,
        id: ++serial.current,
        expires: age.current + SCENERY_DEBRIS_SECONDS,
      }));
      if (!added.length) return;
      setFragments((old) => limitDebris(old, added));
      if (kind !== "foliage" && age.current - lastSound.current > 0.12) {
        lastSound.current = age.current;
        onBreak(kind, impact.speed);
      }
    },
    [onBreak],
  );
  const value = useMemo(
    () => ({
      emit,
      focus,
      yielding: yielding.current,
      grace: grace.current,
      physicsTime,
      impact,
    }),
    [emit, focus, impact],
  );
  return (
    <Context.Provider value={value}>
      {children}
      {fragments.map((f) => (
        <SceneryFragment key={f.id} piece={f} />
      ))}
    </Context.Provider>
  );
}
function SceneryFragment({ piece }: { piece: Fragment }) {
  const body = useRef<RapierRigidBody>(null),
    data = useImpactVelocity(body, "debris");
  const colliderRef = useDebrisGrace();
  return (
    <RigidBody
      ref={body}
      userData={data}
      position={piece.p}
      rotation={piece.rotation}
      linearVelocity={piece.velocity}
      angularVelocity={piece.spin}
      colliders={false}
      linearDamping={0.18}
      angularDamping={0.5}
      friction={0.75}
      restitution={0.22}
      ccd
    >
      <CuboidCollider
        ref={colliderRef}
        args={piece.s.map((n) => Math.max(0.045, n * 0.46)) as Tuple}
        mass={piece.mass}
      />
      <mesh scale={piece.s} castShadow receiveShadow>
        {piece.shape === "pine" ? (
          <coneGeometry args={[0.5, 1, 8]} />
        ) : piece.shape && piece.shape !== "box" ? (
          <icosahedronGeometry args={[0.5, 0]} />
        ) : (
          <boxGeometry />
        )}
        <meshStandardMaterial color={piece.color} roughness={0.88} />
      </mesh>
    </RigidBody>
  );
}
export function SceneryBatch({
  props,
  bark,
}: {
  props: SceneryProp[];
  bark?: THREE.Texture;
}) {
  const [removed, setRemoved] = useState<ReadonlySet<string>>(() => new Set()),
    destroyed = useRef(new Set<string>()),
    { emit, impact: impactFor } = useSceneryDestruction();
  const batches = useMemo(() => {
    const result: Record<string, Instance[]> = {
      box: [],
      leaf: [],
      pine: [],
      rock: [],
    };
    for (const prop of props)
      if (!removed.has(prop.id))
        for (const part of prop.pieces) {
          const shape = part.shape ?? "box",
            factor = shape === "box" ? 1 : 0.5;
          result[shape].push({
            x: part.p[0],
            y: part.p[1],
            z: part.p[2],
            sx: part.s[0] * factor,
            sy: part.s[1] * (shape === "pine" ? 0.5 : factor),
            sz: part.s[2] * factor,
            rotation: part.rotation?.[1],
            color: part.color,
          });
        }
    return result;
  }, [props, removed]);
  const hit = (prop: SceneryProp, event: CollisionEnterPayload) => {
    if (destroyed.current.has(prop.id)) return;
    const impact = impactFor(event, prop.kind);
    if (!impact) return;
    destroyed.current.add(prop.id);
    event.target.collider?.setEnabled(false);
    setRemoved(new Set(destroyed.current));
    emit(prop.pieces, prop.kind, impact);
  };
  return (
    <>
      {Object.entries(batches)
        .filter(([, items]) => items.length)
        .map(([shape, items]) => (
          <Instances
            key={shape}
            items={items}
            shape={shape as "box" | "leaf" | "pine" | "rock"}
            map={shape === "box" ? bark : undefined}
            spatial
          />
        ))}
      <RigidBody type="fixed" colliders={false}>
        {props
          .filter((p) => !removed.has(p.id))
          .map((p) => (
            <YieldingCuboid
              key={p.id}
              kind={p.kind}
              args={p.half}
              position={p.p}
              rotation={p.rotation}
              onCollisionEnter={(e) => hit(p, e)}
            />
          ))}
      </RigidBody>
    </>
  );
}
// Preserve the detailed intact meshes; capture their world-space pieces only on impact.
export function DestructibleAssembly({
  children,
  kind,
  half,
  center = [0, 0, 0],
  dynamic = false,
}: {
  children: ReactNode;
  kind: PropKind;
  half: Tuple;
  center?: Tuple;
  dynamic?: boolean;
}) {
  const [broken, setBroken] = useState(false),
    done = useRef(false),
    visual = useRef<THREE.Group>(null),
    body = useRef<RapierRigidBody>(null),
    { emit, impact: impactFor } = useSceneryDestruction();
  const yieldingRef = useYieldingCollider(kind);
  const data = useImpactVelocity(body, kind);
  const hit = (event: CollisionEnterPayload) => {
    if (done.current || !visual.current) return;
    const impact = impactFor(event, kind, data.velocity, dynamic);
    if (!impact) return;
    done.current = true;
    body.current?.setEnabled(false);
    const pieces: Piece[] = [];
    visual.current.updateWorldMatrix(true, true);
    visual.current.traverse((object) => {
      if (
        !(object instanceof THREE.Mesh) ||
        object instanceof THREE.InstancedMesh
      )
        return;
      const geometry = object.geometry;
      geometry.computeBoundingBox();
      if (!geometry.boundingBox) return;
      const position = geometry.boundingBox
          .getCenter(new THREE.Vector3())
          .applyMatrix4(object.matrixWorld),
        scale = new THREE.Vector3(),
        q = new THREE.Quaternion(),
        unused = new THREE.Vector3();
      object.matrixWorld.decompose(unused, q, scale);
      const size = geometry.boundingBox
          .getSize(new THREE.Vector3())
          .multiply(scale),
        rotation = new THREE.Euler().setFromQuaternion(q),
        material = Array.isArray(object.material)
          ? object.material[0]
          : object.material;
      pieces.push({
        p: position.toArray() as Tuple,
        s: [
          Math.max(0.08, size.x),
          Math.max(0.08, size.y),
          Math.max(0.08, size.z),
        ],
        rotation: [rotation.x, rotation.y, rotation.z],
        color:
          "color" in material
            ? (material.color as THREE.Color).getStyle()
            : "#ccd0ad",
      });
    });
    if (kind === "tire" && pieces[0]) {
      const tire = pieces[0];
      pieces.splice(
        0,
        pieces.length,
        ...Array.from({ length: 4 }, (_, i) => ({
          p: [
            tire.p[0] + Math.cos((i * Math.PI) / 2) * 0.4,
            tire.p[1],
            tire.p[2] + Math.sin((i * Math.PI) / 2) * 0.4,
          ] as Tuple,
          s: [0.6, 0.3, 0.6] as Tuple,
          color: tire.color,
        })),
      );
    }
    emit(pieces, kind, impact);
    setBroken(true);
  };
  if (broken) return null;
  return (
    <RigidBody
      ref={body}
      type={dynamic ? "dynamic" : "fixed"}
      colliders={false}
      onCollisionEnter={hit}
      userData={data}
      restitution={0.25}
      friction={0.7}
      angularDamping={0.2}
      ccd={dynamic}
    >
      {kind === "tire" ? (
        <CylinderCollider
          ref={yieldingRef}
          args={[half[1], half[0]]}
          mass={sceneryMaterials.tire.mass}
        />
      ) : (
        <CuboidCollider ref={yieldingRef} args={half} position={center} />
      )}
      <group ref={visual}>{children}</group>
    </RigidBody>
  );
}

function useYieldingCollider(kind: PropKind) {
  const { yielding } = useSceneryDestruction(),
    previous = useRef<number | null>(null);
  return useCallback(
    (collider: RapierCollider | null) => {
      if (previous.current !== null) {
        const old = yielding.get(previous.current);
        if (old) setWheelSupport(old.collider, true);
        yielding.delete(previous.current);
      }
      previous.current = collider?.handle ?? null;
      if (collider && LIGHT_PROPS.has(kind)) {
        collider.setActiveHooks(1);
        setWheelSupport(collider, false);
        yielding.set(collider.handle, { collider, kind });
      }
    },
    [kind, yielding],
  );
}
function useDebrisGrace() {
  const { grace, physicsTime } = useSceneryDestruction(),
    previous = useRef<number | null>(null);
  return useCallback(
    (collider: RapierCollider | null) => {
      if (previous.current !== null) {
        const old = grace.get(previous.current);
        if (old) setWheelSupport(old.collider, true);
        grace.delete(previous.current);
      }
      previous.current = collider?.handle ?? null;
      if (collider) {
        collider.setActiveHooks(1);
        setWheelSupport(collider, false);
        grace.set(collider.handle, {
          collider,
          until: physicsTime.current + DEBRIS_CAR_GRACE,
        });
      }
    },
    [grace, physicsTime],
  );
}
function YieldingCuboid({
  kind,
  ...props
}: React.ComponentProps<typeof CuboidCollider> & { kind: PropKind }) {
  const ref = useYieldingCollider(kind);
  return <CuboidCollider {...props} ref={ref} />;
}
export function NpcCollider() {
  const ref = useYieldingCollider("npc");
  return (
    <CapsuleCollider
      ref={ref}
      args={[0.55, 0.36]}
      position={[0, 0.98, 0]}
      friction={0.5}
    />
  );
}

// Spatial lookups keep mowing local instead of scanning every grass blade each frame.
export function useVegetationDamage(
  mesh: RefObject<THREE.InstancedMesh | null>,
  points: ReadonlyArray<{ x: number; y: number; z: number; color?: string }>,
) {
  const { focus } = useSceneryDestruction(),
    last = useRef({ x: Infinity, z: Infinity }),
    cut = useRef(new Set<number>()),
    zero = useMemo(() => new THREE.Matrix4().makeScale(0, 0, 0), []);
  const cells = useMemo(() => {
    const map = new Map<string, number[]>();
    points.forEach((p, i) => {
      const key = vegetationCell(p.x, p.z);
      const bucket = map.get(key);
      if (bucket) bucket.push(i);
      else map.set(key, [i]);
    });
    return map;
  }, [points]);
  useEffect(() => {
    mesh.current?.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  }, [mesh]);
  useFrame(() => {
    const car = focus.current;
    if (
      !mesh.current ||
      Math.hypot(car.x - last.current.x, car.z - last.current.z) < 0.65
    )
      return;
    last.current = { x: car.x, z: car.z };
    let changed = false;
    for (let dx = -1; dx <= 1; dx++)
      for (let dz = -1; dz <= 1; dz++)
        for (const i of cells.get(
          vegetationCell(car.x + dx * 4, car.z + dz * 4),
        ) ?? []) {
          const p = points[i];
          if (cut.current.has(i) || Math.hypot(p.x - car.x, p.z - car.z) > 1.7)
            continue;
          cut.current.add(i);
          mesh.current.setMatrixAt(i, zero);
          mesh.current.instanceMatrix.addUpdateRange(i * 16, 16);
          changed = true;
        }
    if (changed) {
      mesh.current.instanceMatrix.needsUpdate = true;
    }
  });
}
