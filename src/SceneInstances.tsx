import { memo, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
export type Instance = {
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
  shape?: "box" | "leaf" | "pine" | "rock" | "roof";
  finish?: "matte" | "glass";
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
  finish = "matte",
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
      ) : shape === "roof" ? (
        <coneGeometry args={[0.707, 1, 4]} />
      ) : shape === "pine" ? (
        <coneGeometry args={[1, 2, 10]} />
      ) : (
        <icosahedronGeometry args={[1, shape === "leaf" ? 1 : 0]} />
      )}
      <meshStandardMaterial
        roughness={finish === "glass" ? 0.25 : 0.94}
        metalness={finish === "glass" ? 0.3 : 0}
        flatShading
        map={map}
        bumpMap={map}
        bumpScale={0.04}
      />
    </instancedMesh>
  );
});
