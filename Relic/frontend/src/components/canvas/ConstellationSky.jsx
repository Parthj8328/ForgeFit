import React, { useRef, useState, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import * as THREE from "three";
import StarNode from "./StarNode";
import OrbitLines from "./OrbitLines";

function CameraRig({ focus }) {
  const { camera } = useThree();
  const target = useRef(new THREE.Vector3());
  const look = useRef(new THREE.Vector3());

  useFrame(() => {
    if (focus) {
      const node = new THREE.Vector3(focus.coord_x, focus.coord_y, focus.coord_z);
      const dir = node.clone().normalize();
      target.current.copy(node).add(dir.multiplyScalar(3.2));
      look.current.copy(node);
    } else {
      target.current.set(0, 1.5, 13);
      look.current.set(0, 0, 0);
    }
    camera.position.lerp(target.current, 0.045);
    const cl = new THREE.Vector3();
    camera.getWorldDirection(cl);
    const desired = look.current.clone().sub(camera.position).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(cl, desired);
    camera.quaternion.premultiply(q.slerp(new THREE.Quaternion(), 0.9));
    camera.lookAt(look.current);
  });
  return null;
}

function DragController({ draggingId, startPos, onMove, onEnd }) {
  const { camera, gl } = useThree();
  const plane = useRef(new THREE.Plane());
  const raycaster = useRef(new THREE.Raycaster());

  useEffect(() => {
    if (!draggingId || !startPos) return;
    const camDir = new THREE.Vector3();
    camera.getWorldDirection(camDir);
    plane.current.setFromNormalAndCoplanarPoint(camDir, new THREE.Vector3(...startPos));
    const el = gl.domElement;

    const handleMove = (e) => {
      const rect = el.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
      raycaster.current.setFromCamera(ndc, camera);
      const pt = new THREE.Vector3();
      if (raycaster.current.ray.intersectPlane(plane.current, pt)) {
        onMove([pt.x, pt.y, pt.z]);
      }
    };
    const handleUp = () => { document.body.style.cursor = "auto"; onEnd(); };

    el.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      el.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draggingId]);

  return null;
}

export default function ConstellationSky({ memories, onSelect, focus, rearrange, onReposition }) {
  const [draggingId, setDraggingId] = useState(null);
  const [overrides, setOverrides] = useState({});

  const startDrag = (memory) => {
    setDraggingId(memory.id);
    setOverrides((o) => ({ ...o, [memory.id]: [memory.coord_x, memory.coord_y, memory.coord_z] }));
  };
  const moveDrag = (coords) => {
    if (!draggingId) return;
    setOverrides((o) => ({ ...o, [draggingId]: coords }));
  };
  const endDrag = () => {
    if (!draggingId) return;
    const coords = overrides[draggingId];
    const id = draggingId;
    setDraggingId(null);
    if (coords) onReposition(id, coords);
  };

  const startPos = draggingId ? overrides[draggingId] : null;
  const posFor = (m) => overrides[m.id] || [m.coord_x, m.coord_y, m.coord_z];
  const lineMemories = memories.map((m) => {
    const p = overrides[m.id];
    return p ? { ...m, coord_x: p[0], coord_y: p[1], coord_z: p[2] } : m;
  });

  return (
    <Canvas camera={{ position: [0, 1.5, 13], fov: 55 }} gl={{ antialias: true, alpha: true }} dpr={[1, 2]}>
      <color attach="background" args={["#0A0A0F"]} />
      <fog attach="fog" args={["#0A0A0F", 14, 30]} />
      <ambientLight intensity={0.4} />
      <pointLight position={[0, 0, 0]} intensity={1.2} color="#F6D06D" />

      <Stars radius={60} depth={40} count={2600} factor={4} saturation={0} fade speed={0.6} />

      <OrbitLines memories={lineMemories} />
      {memories.map((m) => (
        <StarNode
          key={m.id}
          memory={m}
          pos={posFor(m)}
          onSelect={onSelect}
          dimmed={!!focus && focus.id !== m.id}
          rearrange={rearrange}
          onDragStart={startDrag}
        />
      ))}

      <CameraRig focus={focus} />
      <DragController draggingId={draggingId} startPos={startPos} onMove={moveDrag} onEnd={endDrag} />
      <OrbitControls
        enablePan={false}
        enabled={!focus && !draggingId}
        minDistance={5}
        maxDistance={22}
        autoRotate={!focus && !rearrange}
        autoRotateSpeed={0.35}
        rotateSpeed={0.5}
        dampingFactor={0.08}
        enableDamping
      />
    </Canvas>
  );
}
