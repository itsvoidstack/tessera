"use client";

/**
 * HeroDiagram — animated architecture illustration for the landing page hero.
 *
 * Design rules:
 * - Same nodes, colors, layout, and lines as the original inline SVG.
 * - Node positions are unchanged; tiny CSS animations give them independent life.
 * - Particles travel along each edge using SVG <animateMotion> — no JS timers.
 * - The card wrapper keeps the existing `animate-float-subtle` class (now 8 s, 14 px).
 * - All motion freezes when `prefers-reduced-motion: reduce` is set.
 * - No external libraries. Pure CSS + native SVG SMIL.
 */

const NODES = [
  { x: 200, y: 60,  label: "Frontend",   color: "#1a5c38", bobClass: "hero-node-0" },
  { x: 100, y: 150, label: "API Router", color: "#2563eb", bobClass: "hero-node-1" },
  { x: 200, y: 150, label: "Auth Module",color: "#7c3aed", bobClass: "hero-node-2" },
  { x: 300, y: 150, label: "Services",   color: "#d97706", bobClass: "hero-node-3" },
  { x: 160, y: 230, label: "Database",   color: "#0891b2", bobClass: "hero-node-4" },
  { x: 240, y: 230, label: "Cache",      color: "#ea580c", bobClass: "hero-node-5" },
];

/**
 * Each edge is defined as a straight path string (M x1 y1 L x2 y2).
 * Particles are offset in time so they stagger naturally.
 * dur    — how long one pass takes (vary per edge length for consistent speed feel)
 * delay  — stagger offset so all particles don't start together
 * color  — the accent color of the source node (subtle tint on the dot)
 */
const EDGES = [
  // from Frontend (200,60) to API Router (100,150)
  { path: "M200,60 L100,150", dur: "2.8s", delay: "0s",    color: "#1a5c38" },
  // from Frontend (200,60) to Services (300,150)
  { path: "M200,60 L300,150", dur: "2.8s", delay: "1.4s",  color: "#1a5c38" },
  // from API Router (100,150) to Database (160,230)
  { path: "M100,150 L160,230", dur: "2.2s", delay: "0.6s", color: "#2563eb" },
  // from Services (300,150) to Cache (240,230)
  { path: "M300,150 L240,230", dur: "2.2s", delay: "1.9s", color: "#d97706" },
  // from Frontend (200,60) to Auth Module (200,150)
  { path: "M200,60 L200,150", dur: "2.0s", delay: "0.9s",  color: "#7c3aed" },
];

export default function HeroDiagram() {
  return (
    <div className="relative bg-gray-50/80 dark:bg-gray-900/60 border border-gray-200/80 dark:border-gray-800 rounded-2xl p-8 h-[380px] overflow-hidden flex items-center justify-center animate-float-subtle">
      <svg viewBox="0 0 400 300" className="w-full h-full" aria-hidden="true">

        {/* ── Static edges (dashed lines) ─────────────────────────────── */}
        <line x1="200" y1="60"  x2="100" y2="150"
          stroke="currentColor" className="text-gray-200 dark:text-gray-800"
          strokeWidth="1.5" strokeDasharray="4,4" />
        <line x1="200" y1="60"  x2="300" y2="150"
          stroke="currentColor" className="text-gray-200 dark:text-gray-800"
          strokeWidth="1.5" strokeDasharray="4,4" />
        <line x1="100" y1="150" x2="160" y2="230"
          stroke="currentColor" className="text-gray-200 dark:text-gray-800"
          strokeWidth="1.5" />
        <line x1="300" y1="150" x2="240" y2="230"
          stroke="currentColor" className="text-gray-200 dark:text-gray-800"
          strokeWidth="1.5" />
        <line x1="200" y1="60"  x2="200" y2="150"
          stroke="currentColor" className="text-gray-200 dark:text-gray-800"
          strokeWidth="1.5" />

        {/* ── Travelling particles ─────────────────────────────────────── */}
        {EDGES.map((edge, i) => (
          <circle key={i} r="3" fill={edge.color} opacity="0">
            {/* opacity pulse — gives a "signal packet" feel */}
            <animate
              attributeName="opacity"
              values="0;0.65;0.55;0.65;0"
              keyTimes="0;0.12;0.5;0.88;1"
              dur={edge.dur}
              begin={edge.delay}
              repeatCount="indefinite"
            />
            {/* motion along the edge path */}
            <animateMotion
              path={edge.path}
              dur={edge.dur}
              begin={edge.delay}
              repeatCount="indefinite"
              calcMode="linear"
            />
          </circle>
        ))}

        {/* ── Nodes ────────────────────────────────────────────────────── */}
        {NODES.map((node, i) => (
          /*
           * Each <g> gets a CSS animation class for the independent bob.
           * SVG `transform-origin` is set to the node's centre so the
           * movement is a gentle drift rather than a rotation about the SVG origin.
           */
          <g
            key={i}
            className={`${node.bobClass} cursor-pointer`}
            style={{ transformOrigin: `${node.x}px ${node.y}px` }}
          >
            <rect
              x={node.x - 45}
              y={node.y - 18}
              width="90"
              height="36"
              rx="6"
              className="fill-white dark:fill-gray-900 stroke-gray-200 dark:stroke-gray-700"
              strokeWidth="1.5"
            />
            <circle cx={node.x - 30} cy={node.y} r="4" fill={node.color} />
            <text
              x={node.x + 4}
              y={node.y + 4}
              textAnchor="middle"
              className="fill-gray-800 dark:fill-gray-200"
              fontSize="11"
              fontWeight="600"
              fontFamily="inherit"
            >
              {node.label}
            </text>
          </g>
        ))}

      </svg>
    </div>
  );
}
