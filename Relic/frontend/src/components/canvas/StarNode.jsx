import React, { useRef, useState, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";

const TYPE_COLOR = {
  polaroid: "#F6D06D",
  letter: "#E9E6F0",
  milestone: "#FF6B8B",
  capsule: "#F6A94D",
};

function countdown(unlockAt) {
  const diff = new Date(unlockAt).getTime() - Date.now();
  if (diff <= 0) return null;
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function StarNode({ memory, onSelect, dimmed, pos, rearrange, onDragStart }) {
  const meshRef = useRef();
  const haloRef = useRef();
  const ringRef = useRef();
  const [hovered, setHovered] = useState(false);

  const locked = memory.is_locked;
  const isMilestone = memory.memory_type === "milestone";
  const color = useMemo(() => new THREE.Color(TYPE_COLOR[memory.memory_type] || "#E9E6F0"), [memory.memory_type]);
  const position = pos || [memory.coord_x, memory.coord_y, memory.coord_z];
  const baseSize = isMilestone ? 0.26 : 0.16;

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (meshRef.current) {
      const pulse = locked ? 1 + Math.sin(t * 2.2) * 0.12 : 1 + Math.sin(t * 1.4 + memory.coord_x) * 0.06;
      const target = (hovered ? 1.5 : 1) * pulse;
      meshRef.current.scale.setScalar(THREE.MathUtils.lerp(meshRef.current.scale.x, target, 0.15));
    }
    if (haloRef.current) {
      haloRef.current.material.opacity = (hovered ? 0.35 : 0.18) * (locked ? 0.9 + Math.sin(t * 2.2) * 0.3 : 1);
    }
    if (ringRef.current) {
      ringRef.current.rotation.z = t * 0.5;
      ringRef.current.rotation.x = Math.PI / 2.6;
    }
  });

  const emissiveIntensity = hovered ? 3.2 : isMilestone ? 2.4 : 1.8;

  return (
    <group position={position}>
      {/* glow halo */}
      <mesh ref={haloRef}>
        <sphereGeometry args={[baseSize * 3.4, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.18} depthWrite={false} />
      </mesh>

      {/* core star */}
      <mesh
        ref={meshRef}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = rearrange ? "grab" : "pointer"; }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = "auto"; }}
        onPointerDown={(e) => {
          if (rearrange) { e.stopPropagation(); document.body.style.cursor = "grabbing"; onDragStart(memory); }
        }}
        onClick={(e) => { e.stopPropagation(); if (rearrange) return; onSelect(memory); }}
      >
        <sphereGeometry args={[baseSize, 24, 24]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={emissiveIntensity}
          transparent
          opacity={dimmed && !hovered ? 0.35 : 1}
          toneMapped={false}
        />
      </mesh>

      {/* capsule orbit ring */}
      {locked && (
        <mesh ref={ringRef}>
          <torusGeometry args={[baseSize * 2.4, 0.012, 8, 60]} />
          <meshBasicMaterial color={"#F6A94D"} transparent opacity={0.7} />
        </mesh>
      )}

      {/* labels */}
      {(hovered || locked) && (
        <Html center distanceFactor={10} position={[0, baseSize * 4.2, 0]} style={{ pointerEvents: "none" }}>
          <div style={{ transform: "translateY(-6px)", whiteSpace: "nowrap", textAlign: "center" }}>
            {hovered && (
              <div className="font-hand" style={{ color: "#fff", fontSize: 18, textShadow: "0 2px 12px rgba(0,0,0,0.9)" }}>
                {locked ? "Sealed Capsule" : memory.title}
              </div>
            )}
            {locked && memory.unlock_at && countdown(memory.unlock_at) && (
              <div style={{ color: "#F6A94D", fontSize: 11, letterSpacing: 1, textShadow: "0 1px 6px #000" }}>
                unlocks in {countdown(memory.unlock_at)}
              </div>
            )}
          </div>
        </Html>
      )}
    </group>
  );
}
