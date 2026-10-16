import {
  memo,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  type RefObject,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  CuboidCollider,
  Physics,
  RigidBody,
  useBeforePhysicsStep,
  useRapier,
  type RapierRigidBody,
} from "@react-three/rapier";
import * as THREE from "three";
import {
  zones,
  type DriveInput,
  type Telemetry,
  type ZoneId,
} from "./gameData";
import { TownLandscape as Landscape } from "./TownLandscape";
import { RacecarModel } from "./RacecarModel";
import { townSpawn, isPaved } from "./worldLayout";
import { useImpactVelocity, type BreakHandler } from "./Destruction";
import { RenderDiagnostics } from "./RenderDiagnostics";
import {
  createVehicle,
  driveVehicle,
  suspension,
  vehicleOrientation,
  racecarShape,
} from "./vehiclePhysics";

type Pose = {
  x: number;
  y: number;
  z: number;
  heading: number;
  speed: number;
  upright: number;
};
type Props = {
  input: RefObject<DriveInput>;
  inspection: string | null;
  paused: boolean;
  onTelemetry: (t: Telemetry) => void;
  onReady: () => void;
  onBreak: BreakHandler;
  worldReset: number;
  visited: ZoneId[];
  onSelect: (id: string) => void;
};
const spawn = townSpawn;
function Car({
  input,
  pose,
  paused,
  onTelemetry,
}: Props & { pose: RefObject<Pose> }) {
  const { world } = useRapier();
  const body = useRef<RapierRigidBody>(null),
    visual = useRef<THREE.Group>(null),
    wheels = useRef<(THREE.Group | null)[]>([]),
    wheelMounts = useRef<(THREE.Group | null)[]>([]);
  const vehicle = useRef<ReturnType<typeof createVehicle> | null>(null);
  const heading = useRef(spawn.heading),
    resetSeen = useRef(0),
    jumpSeen = useRef(0),
    jumpCooldown = useRef(0),
    report = useRef(0),
    contacts = useRef(0);
  const renderedPosition = useMemo(() => new THREE.Vector3(), []);
  const vehicleData = useImpactVelocity(body, "vehicle");
  useEffect(() => {
    const b = body.current;
    if (paused && b?.isValid()) {
      b.setLinvel({ x: 0, y: 0, z: 0 }, true);
      b.setAngvel({ x: 0, y: 0, z: 0 }, true);
    }
  }, [paused]);
  useEffect(() => {
    return () => {
      if (vehicle.current) {
        world.removeVehicleController(vehicle.current);
        vehicle.current = null;
      }
    };
  }, [world]);
  useBeforePhysicsStep(() => {
    const b = body.current;
    if (!b?.isValid()) return;
    const controller =
      vehicle.current ?? (vehicle.current = createVehicle(world, b));
    const p = b.translation(),
      i = input.current,
      dt = 1 / 60;
    if (
      i.reset !== resetSeen.current ||
      p.y < -4 ||
      Math.abs(p.x) > 245 ||
      Math.abs(p.z) > 245
    ) {
      resetSeen.current = i.reset;
      heading.current = spawn.heading;
      jumpSeen.current = i.jump;
      jumpCooldown.current = 0;
      contacts.current = 0;
      b.setTranslation(spawn, true);
      b.setLinvel({ x: 0, y: 0, z: 0 }, true);
      b.setAngvel({ x: 0, y: 0, z: 0 }, true);
      b.setRotation(
        {
          x: 0,
          y: Math.sin(spawn.heading / 2),
          z: 0,
          w: Math.cos(spawn.heading / 2),
        },
        true,
      );
      return;
    }
    if (paused) return;
    const k = i.keys,
      throttle =
        i.throttle ||
        Number(k.has("w") || k.has("arrowup")) -
          Number(k.has("s") || k.has("arrowdown"));
    const turn =
      i.steering ||
      Number(k.has("a") || k.has("arrowleft")) -
        Number(k.has("d") || k.has("arrowright"));
    const brake = i.brake || k.has("b") || k.has("control"),
      boost = k.has("shift");
    contacts.current = driveVehicle(
      controller,
      b,
      {
        throttle,
        turn,
        brake,
        boost,
      },
      dt,
    );
    jumpCooldown.current = Math.max(0, jumpCooldown.current - dt);
    if (i.jump !== jumpSeen.current) {
      jumpSeen.current = i.jump;
      if (
        contacts.current >= 2 &&
        vehicleOrientation(b).upright > 0.3 &&
        jumpCooldown.current === 0
      ) {
        b.applyImpulse({ x: 0, y: b.mass() * 6.4, z: 0 }, true);
        jumpCooldown.current = 0.8;
      }
    }
  });
  useFrame((_, delta) => {
    const b = body.current;
    if (!b?.isValid()) return;
    const p = b.translation(),
      v = b.linvel(),
      speed = Math.hypot(v.x, v.z);
    const orientation = vehicleOrientation(b);
    // Rapier interpolates the visual transform between fixed physics steps.
    // Follow that transform so a high-refresh display doesn't track 60 Hz jumps.
    visual.current?.getWorldPosition(renderedPosition);
    const rendered = visual.current ? renderedPosition : p;
    heading.current = orientation.heading;
    pose.current = {
      x: rendered.x,
      y: rendered.y,
      z: rendered.z,
      heading: heading.current,
      speed,
      upright: orientation.upright,
    };
    const controller = vehicle.current;
    if (controller) {
      wheels.current.forEach((wheel, index) => {
        if (wheel) wheel.rotation.x = controller.wheelRotation(index) ?? 0;
      });
      wheelMounts.current.forEach((mount, index) => {
        if (!mount) return;
        mount.rotation.y = controller.wheelSteering(index) ?? 0;
        mount.position.y =
          suspension.anchor -
          (controller.wheelSuspensionLength(index) ?? suspension.rest);
      });
    }
    report.current += delta;
    if (report.current > 0.16) {
      report.current = 0;
      const zone = zones.find(
        (zone) =>
          Math.hypot(p.x - zone.x, p.z - zone.z) < 25 ||
          Math.hypot(p.x - zone.landmark[0], p.z - zone.landmark[2]) < 12,
      );
      const near = zone?.firstEntry ?? null;
      onTelemetry({
        x: p.x,
        z: p.z,
        speed: speed * 3.6,
        heading: heading.current,
        near,
        airborne: contacts.current === 0,
        flipped: orientation.upright < 0.1,
      });
    }
  }, -20);
  return (
    <RigidBody
      ref={body}
      position={[spawn.x, spawn.y, spawn.z]}
      rotation={[0, spawn.heading, 0]}
      colliders={false}
      linearDamping={0.05}
      angularDamping={0.18}
      friction={0.55}
      restitution={0.18}
      ccd
      canSleep={false}
      userData={vehicleData}
    >
      <CuboidCollider
        args={racecarShape.chassis.half}
        position={racecarShape.chassis.position}
        mass={racecarShape.chassis.mass}
      />
      <CuboidCollider
        args={racecarShape.cockpit.half}
        position={racecarShape.cockpit.position}
        mass={racecarShape.cockpit.mass}
      />
      <group ref={visual}>
        <RacecarModel
          visible={true}
          wheels={wheels}
          mounts={wheelMounts}
          input={input}
        />
      </group>
    </RigidBody>
  );
}
function Dust({
  pose,
  paused,
  input,
}: {
  pose: RefObject<Pose>;
  paused: boolean;
  input: RefObject<DriveInput>;
}) {
  const ref = useRef<THREE.InstancedMesh>(null),
    cursor = useRef(0),
    clock = useRef(0);
  const particles = useMemo(
      () => Array.from({ length: 36 }, () => ({ x: 0, y: -20, z: 0, age: 9 })),
      [],
    ),
    dummy = useMemo(() => new THREE.Object3D(), []);
  useFrame((_, d) => {
    clock.current += d;
    const p = pose.current;
    const offroad = !isPaved(p.x, p.z);
    const drifting =
      input.current.brake ||
      input.current.keys.has("b") ||
      input.current.keys.has("control");
    if (
      !paused &&
      (offroad || drifting) &&
      p.speed > 2 &&
      p.y < 1.2 &&
      clock.current > 0.05
    ) {
      clock.current = 0;
      const item = particles[cursor.current++ % particles.length];
      item.x = p.x + Math.sin(p.heading) * 1.5 + (Math.random() - 0.5);
      item.z = p.z + Math.cos(p.heading) * 1.5 + (Math.random() - 0.5);
      item.y = 0.2;
      item.age = 0;
    }
    particles.forEach((v, i) => {
      v.age += d;
      v.y += d * 0.2;
      dummy.position.set(v.x, v.y, v.z);
      dummy.scale.setScalar(
        v.age < 1.4 ? Math.sin((v.age / 1.4) * Math.PI) * 0.28 : 0,
      );
      dummy.updateMatrix();
      ref.current?.setMatrixAt(i, dummy.matrix);
    });
    if (ref.current) ref.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, 36]}
      frustumCulled={false}
    >
      <icosahedronGeometry args={[1, 0]} />
      <meshStandardMaterial
        color="#ecd0a4"
        transparent
        opacity={0.45}
        depthWrite={false}
      />
    </instancedMesh>
  );
}
function FollowCamera({
  pose,
  inspection,
}: {
  pose: RefObject<Pose>;
  inspection: string | null;
}) {
  const { camera, gl, size } = useThree(),
    orbit = useRef(spawn.heading + 0.65),
    yaw = useRef(spawn.heading + 0.65),
    zoom = useRef(1),
    range = useRef(29),
    distance = useRef(1),
    drag = useRef<{ x: number; y: number } | null>(null),
    look = useMemo(() => new THREE.Vector3(spawn.x, 0, spawn.z - 6), []),
    desired = useMemo(() => new THREE.Vector3(), []),
    target = useMemo(() => new THREE.Vector3(), []);
  useEffect(() => {
    const canvas = gl.domElement;
    const down = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button === 0)
        drag.current = { x: e.clientX, y: e.clientY };
    };
    const move = (e: PointerEvent) => {
      if (drag.current && !inspection) {
        orbit.current -= (e.clientX - drag.current.x) * 0.006;
        drag.current = { x: e.clientX, y: e.clientY };
      }
    };
    const up = () => {
      drag.current = null;
    };
    const wheel = (e: WheelEvent) => {
      distance.current = THREE.MathUtils.clamp(
        distance.current + e.deltaY * 0.0008,
        0.65,
        1.5,
      );
    };
    canvas.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    canvas.addEventListener("wheel", wheel, { passive: true });
    return () => {
      canvas.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      canvas.removeEventListener("wheel", wheel);
    };
  }, [gl, inspection]);
  useFrame((_, d) => {
    const p = pose.current;
    const dt = Math.min(d, 0.05);
    // A steady world-space view keeps turns readable. Drag still orbits freely.
    yaw.current += (orbit.current - yaw.current) * (1 - Math.exp(-dt * 12));
    zoom.current += (distance.current - zoom.current) * (1 - Math.exp(-dt * 8));
    const desiredRange =
      (size.width < 650 ? 30 : 27) + Math.min(p.speed * 0.08, 3);
    range.current += (desiredRange - range.current) * (1 - Math.exp(-dt * 4));
    target.set(p.x, p.y + 0.4, p.z);
    desired.set(
      p.x + Math.sin(yaw.current) * range.current * zoom.current,
      p.y + 25 * zoom.current,
      p.z + Math.cos(yaw.current) * range.current * zoom.current,
    );
    const teleport = look.distanceTo(target) > 40;
    const blend = teleport ? 1 : 1 - Math.exp(-dt * 10);
    camera.position.lerp(desired, blend);
    look.lerp(target, blend);
    camera.lookAt(look);
  }, -10);
  return null;
}
function GameScene(props: Props) {
  const pose = useRef<Pose>({ ...spawn, speed: 0, upright: 1 });
  const readyFrames = useRef(0);
  useFrame(() => {
    if (readyFrames.current < 2 && ++readyFrames.current === 2) props.onReady();
  });
  return (
    <>
      <Landscape
        onBreak={props.onBreak}
        paused={props.paused}
        visited={props.visited}
        focus={pose}
        onSelect={props.onSelect}
      />
      <Car {...props} pose={pose} />
      <Dust pose={pose} paused={props.paused} input={props.input} />
      <FollowCamera pose={pose} inspection={props.inspection} />
    </>
  );
}
function World(props: Props) {
  return (
    <Canvas
      shadows={{ type: THREE.PCFSoftShadowMap }}
      dpr={[1, 1.5]}
      camera={{
        position: [spawn.x + 8, 20, spawn.z + 28],
        fov: 48,
        near: 0.5,
        far: 650,
      }}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
      }}
    >
      <Suspense fallback={null}>
        {new URLSearchParams(window.location.search).has("performance") && (
          <RenderDiagnostics />
        )}
        <Physics
          gravity={[0, -18, 0]}
          timeStep={1 / 60}
          updatePriority={-50}
          interpolate
          paused={props.paused}
        >
          <GameScene key={props.worldReset} {...props} />
        </Physics>
      </Suspense>
    </Canvas>
  );
}
export default memo(World);
