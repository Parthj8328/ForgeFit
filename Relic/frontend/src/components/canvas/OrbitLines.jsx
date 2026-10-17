import React, { useMemo } from "react";
import { Line } from "@react-three/drei";

// Connect memories chronologically with a soft constellation thread.
export default function OrbitLines({ memories }) {
  const points = useMemo(() => {
    return memories
      .slice()
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      .map((m) => [m.coord_x, m.coord_y, m.coord_z]);
  }, [memories]);

  if (points.length < 2) return null;

  return (
    <Line
      points={points}
      color="#F6D06D"
      lineWidth={0.7}
      transparent
      opacity={0.22}
      dashed={false}
    />
  );
}
