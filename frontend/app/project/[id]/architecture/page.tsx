"use client";

import { use, useState } from "react";
import { useAppStore, type ArchitectureComponent } from "@/lib/store";
import { useRouter } from "next/navigation";
import { Maximize2, Minus, Plus, AlignLeft, GitBranch, Layers } from "lucide-react";

export default function ArchitecturePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { getProject } = useAppStore();
  const router = useRouter();
  const project = getProject(id);

  const [zoom, setZoom]         = useState(100);
  const [selected, setSelected] = useState<ArchitectureComponent | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-24 text-center px-8">
        <div className="text-3xl mb-3">🔍</div>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Project not found</h2>
        <button
          onClick={() => router.push("/dashboard")}
          className="px-4 py-2 bg-[#1a5c38] text-white rounded-lg text-xs font-medium hover:bg-[#145230] active:scale-[0.98] transition-all"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  const components = project.architectureComponents;
  const edges      = project.architectureEdges;
  const activeComp = selected ?? components[0] ?? null;

  return (
    <div className="h-full flex flex-col bg-white dark:bg-[#0f172a] transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-[#0f172a]">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Architecture Map</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Visualize project components, entry points, and module connections.
          </p>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {components.length === 0 ? (
          /* Empty / Pending state when backend analysis is pending */
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-gray-50/40 dark:bg-gray-900/40">
            <div className="w-14 h-14 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center mb-4 shadow-2xs">
              <GitBranch size={24} className="text-[#1a5c38] dark:text-green-400" />
            </div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Architecture DAG Pending Analysis</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mb-6 leading-relaxed">
              When connected to the FastAPI backend API, the Structure and Dependency agents will extract import graphs to construct an interactive module diagram.
            </p>
            <div className="inline-flex items-center gap-2 border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 rounded-lg px-4 py-2 text-xs text-gray-600 dark:text-gray-300">
              <Layers size={14} className="text-gray-400" />
              <span>Target Repository: <strong>{project.owner}/{project.repo}</strong></span>
            </div>
          </div>
        ) : (
          /* Canvas view */
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center gap-2 px-6 py-3 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-[#0f172a]">
              <button
                onClick={() => setZoom(100)}
                className="flex items-center gap-1.5 border border-gray-200 dark:border-gray-700 rounded-md px-3 py-1.5 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-[0.98] transition-all cursor-pointer"
              >
                <Maximize2 size={12} /> Fit View
              </button>
              <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden bg-white dark:bg-gray-900">
                <button
                  onClick={() => setZoom((z) => Math.max(50, z - 10))}
                  className="px-2.5 py-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                >
                  <Minus size={12} />
                </button>
                <span className="px-3 py-1.5 text-xs text-gray-600 dark:text-gray-300 border-x border-gray-200 dark:border-gray-700 min-w-[52px] text-center font-mono">
                  {zoom}%
                </span>
                <button
                  onClick={() => setZoom((z) => Math.min(200, z + 10))}
                  className="px-2.5 py-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                >
                  <Plus size={12} />
                </button>
              </div>
              <button className="flex items-center gap-1.5 border border-gray-200 dark:border-gray-700 rounded-md px-3 py-1.5 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-[0.98] transition-all cursor-pointer">
                <AlignLeft size={12} /> Legend
              </button>
            </div>

            {/* SVG Diagram */}
            <div className="flex-1 overflow-hidden bg-white dark:bg-[#0b0f17] relative">
              <svg
                viewBox="0 0 760 580"
                className="w-full h-full"
                style={{ transform: `scale(${zoom / 100})`, transformOrigin: "center" }}
              >
                <defs>
                  <pattern id="dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                    <circle cx="1" cy="1" r="0.8" className="fill-gray-200 dark:fill-gray-800" />
                  </pattern>
                  <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                    <path d="M0,0 L0,6 L8,3 z" className="fill-gray-300 dark:fill-gray-600" />
                  </marker>
                  <marker id="arrow-highlight" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                    <path d="M0,0 L0,6 L8,3 z" fill="#1a5c38" />
                  </marker>
                </defs>
                <rect width="760" height="580" fill="url(#dots)" />

                {/* Edges */}
                {edges.map((edge, i) => {
                  const from = components.find((c) => c.id === edge.from);
                  const to   = components.find((c) => c.id === edge.to);
                  if (!from || !to) return null;

                  const isConnectedToHovered =
                    hoveredNodeId !== null &&
                    (edge.from === hoveredNodeId || edge.to === hoveredNodeId);

                  return (
                    <line
                      key={i}
                      x1={from.x + 60} y1={from.y + 30}
                      x2={to.x + 60}   y2={to.y + 30}
                      stroke={isConnectedToHovered ? "#1a5c38" : "#d1d5db"}
                      strokeWidth={isConnectedToHovered ? "2.5" : "1.5"}
                      strokeDasharray={edge.type === "indirect" ? "5,4" : undefined}
                      markerEnd={isConnectedToHovered ? "url(#arrow-highlight)" : "url(#arrow)"}
                      className="transition-all duration-200"
                    />
                  );
                })}

                {/* Nodes */}
                {components.map((comp) => {
                  const isSelected = activeComp?.id === comp.id;
                  const isHovered = hoveredNodeId === comp.id;

                  return (
                    <g
                      key={comp.id}
                      transform={`translate(${comp.x}, ${comp.y})`}
                      onClick={() => setSelected(comp)}
                      onMouseEnter={() => setHoveredNodeId(comp.id)}
                      onMouseLeave={() => setHoveredNodeId(null)}
                      className="cursor-pointer transition-transform duration-150"
                    >
                      <rect
                        width="120" height="60" rx="8"
                        className="fill-white dark:fill-gray-900 transition-all duration-200"
                        stroke={isSelected || isHovered ? comp.color : "#e5e7eb"}
                        strokeWidth={isSelected || isHovered ? 2.5 : 1.5}
                      />
                      <rect x="8" y="10" width="22" height="22" rx="4" fill={comp.color} opacity="0.12" />
                      <text x="19" y="24" textAnchor="middle" fill={comp.color} fontSize="10" fontWeight="bold">{"</>"}</text>
                      <text x="60" y="24" textAnchor="middle" className="fill-gray-900 dark:fill-gray-100 text-[10px] font-semibold">{comp.label}</text>
                      <text x="60" y="37" textAnchor="middle" className="fill-gray-500 dark:fill-gray-400 text-[8px]">{comp.sublabel}</text>
                      <text x="60" y="50" textAnchor="middle" className="fill-gray-400 dark:fill-gray-500 text-[7px]">{comp.tech}</text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        )}

        {/* Right Details Panel */}
        {activeComp && components.length > 0 && (
          <div className="w-[260px] border-l border-gray-100 dark:border-gray-800 bg-white dark:bg-[#0f172a] overflow-y-auto p-5 flex-shrink-0">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-4">Module Info</div>
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-7 h-7 rounded-md flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
                style={{ backgroundColor: activeComp.color }}
              >
                {"</>"}
              </div>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">{activeComp.label}</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">
              Module component extracted from codebase analysis.
            </p>
            <div className="text-xs text-gray-400 mb-1">Tech Stack</div>
            <div className="text-xs border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded px-2 py-1 text-gray-700 dark:text-gray-300 font-mono inline-block">
              {activeComp.tech}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
