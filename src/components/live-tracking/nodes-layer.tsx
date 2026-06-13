"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toViewBox } from "@/lib/positioning/coords";

const VIEWBOX_W = 1200;
const VIEWBOX_H = 480;

type NodeRow = {
  node_id: number;
  x: number;
  y: number;
  label: string | null;
  room: string | null;
};

/**
 * Fixed BLE receiver nodes, read from public.nodes (id, x, y, label). These
 * are the stationary anchors placed around the lab — rendered on the live /
 * heatmap floorplan for context. Node x/y are stored in Pi metres (same
 * convention as beacon_live_positions) and normalized through `toViewBox`,
 * exactly like the live beacon dots.
 */
export function NodesLayer() {
  const [nodes, setNodes] = useState<NodeRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    supabase
      .from("nodes")
      .select("node_id, x, y, label, room")
      .order("node_id", { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error("[nodes] fetch failed", error);
          return;
        }
        setNodes((data ?? []) as NodeRow[]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (nodes.length === 0) return null;

  return (
    <svg
      viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
      className="pointer-events-none absolute inset-0 size-full"
      preserveAspectRatio="none"
      aria-hidden
    >
      {nodes.map((n) => {
        // Pi metres → viewBox, same normalization as the live beacon dots.
        const { x, y } = toViewBox(n.x, n.y);
        const caption = n.label ?? n.room;
        const chipW = caption ? Math.max(36, caption.length * 6 + 14) : 0;
        return (
          <g key={n.node_id}>
            <circle cx={x} cy={y} r="22" fill="#2563EB" opacity="0.12" />
            <circle
              cx={x}
              cy={y}
              r="14"
              fill="#2563EB"
              stroke="#FFFFFF"
              strokeWidth="2.5"
            />
            <text
              x={x}
              y={y + 4}
              fontSize="13"
              fontWeight="700"
              textAnchor="middle"
              fill="#FFFFFF"
              fontFamily="ui-sans-serif, system-ui"
            >
              {n.node_id}
            </text>
            {caption ? (
              <g transform={`translate(${x}, ${y + 30})`}>
                <rect
                  x={-chipW / 2}
                  y={-9}
                  width={chipW}
                  height={16}
                  rx={8}
                  fill="#1E3A8A"
                  opacity="0.92"
                />
                <text
                  x={0}
                  y={3}
                  fontSize="9"
                  fontWeight="700"
                  textAnchor="middle"
                  fill="#DBEAFE"
                  fontFamily="ui-sans-serif, system-ui"
                >
                  {caption}
                </text>
              </g>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}
