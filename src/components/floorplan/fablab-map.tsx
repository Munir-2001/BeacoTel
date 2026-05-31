import { cn } from "@/lib/utils";

type Props = {
  /** Disambiguates SVG IDs (patterns, etc.) when multiple instances mount. */
  idPrefix?: string;
  className?: string;
};

export function FabLabMap({ idPrefix = "fl", className }: Props) {
  const gridId = `${idPrefix}-grid`;
  const hatchId = `${idPrefix}-hatch`;

  return (
    <svg
      viewBox="0 0 1200 480"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("size-full", className)}
      fill="none"
    >
      <defs>
        <pattern id={gridId} width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M20 0H0V20" stroke="rgba(15,42,71,0.05)" strokeWidth="1" />
        </pattern>
        <pattern
          id={hatchId}
          width="6"
          height="6"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <line x1="0" y1="0" x2="0" y2="6" stroke="#94A3B8" strokeWidth="1.1" />
        </pattern>
      </defs>

      <rect width="1200" height="480" fill="#F3F6FA" />
      <rect width="1200" height="480" fill={`url(#${gridId})`} />

      {/* Building outline */}
      <rect x="40" y="80" width="1120" height="320" fill="#FFFFFF" stroke="#2563EB" strokeWidth="2" />
      <rect x="48" y="88" width="1104" height="304" fill="none" stroke="#94A3B8" strokeWidth="1" />

      {/* Top window/skylight strip */}
      <g>
        <rect x="100" y="72" width="700" height="16" fill="#FFFFFF" stroke="#475569" strokeWidth="1" />
        {Array.from({ length: 18 }).map((_, i) => (
          <line
            key={i}
            x1={100 + i * 40}
            y1="72"
            x2={100 + i * 40}
            y2="88"
            stroke="#475569"
            strokeWidth="0.6"
          />
        ))}
        <rect x="480" y="68" width="22" height="24" fill="#FFFFFF" stroke="#475569" strokeWidth="1" />
      </g>

      {/* Red dividing walls */}
      <g stroke="#DC2626" strokeWidth="3" strokeLinecap="square">
        <line x1="545" y1="88" x2="545" y2="360" />
        <line x1="545" y1="388" x2="545" y2="400" />
        <line x1="945" y1="88" x2="945" y2="360" />
        <line x1="945" y1="388" x2="945" y2="400" />
      </g>

      {/* Door swing arcs */}
      <g stroke="#475569" strokeWidth="1.1" fill="none">
        <path d="M 250 392 A 40 40 0 0 1 290 352" />
        <line x1="250" y1="392" x2="290" y2="392" stroke="#94A3B8" strokeWidth="2" />
        <path d="M 545 360 A 34 34 0 0 1 579 394" />
        <path d="M 945 360 A 34 34 0 0 1 979 394" />
        <path d="M 1160 200 A 38 38 0 0 1 1122 238" />
        <path d="M 1160 320 A 38 38 0 0 0 1122 282" />
      </g>

      {/* Hatched columns / floor fixtures */}
      <g>
        <rect x="60" y="84" width="18" height="14" fill={`url(#${hatchId})`} stroke="#94A3B8" strokeWidth="0.8" />
        <rect x="60" y="216" width="18" height="22" fill={`url(#${hatchId})`} stroke="#94A3B8" strokeWidth="0.8" />
        <rect x="1122" y="84" width="18" height="14" fill={`url(#${hatchId})`} stroke="#94A3B8" strokeWidth="0.8" />
        <rect x="1122" y="216" width="18" height="22" fill={`url(#${hatchId})`} stroke="#94A3B8" strokeWidth="0.8" />
        <rect x="285" y="252" width="38" height="14" fill={`url(#${hatchId})`} stroke="#94A3B8" strokeWidth="0.8" />
        <rect x="722" y="252" width="32" height="14" fill={`url(#${hatchId})`} stroke="#94A3B8" strokeWidth="0.8" opacity="0.55" />
      </g>

      {/* ELETTRONICA — 3×3 workbench grid */}
      <g fill="#FFFFFF" stroke="#475569" strokeWidth="1">
        {[130, 220, 310].map((y) =>
          [575, 705, 835].map((x) => (
            <rect key={`${x}-${y}`} x={x} y={y} width="90" height="32" rx="1" />
          ))
        )}
      </g>
    </svg>
  );
}

