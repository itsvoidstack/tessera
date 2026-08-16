"use client";

import { use, useState, useMemo } from "react";
import { useAppStore, type ArchitectureComponent, type ArchitectureEdge } from "@/lib/store";
import { useRouter } from "next/navigation";
import { Maximize2, Minus, Plus, AlignLeft, GitBranch, Layers, AlertCircle } from "lucide-react";

function generateArchitectureFromFiles(
  files: Array<{ path: string; size: number; content: string }> | undefined,
  repoName: string
): { components: ArchitectureComponent[]; edges: ArchitectureEdge[] } {
  if (!files || files.length === 0) {
    return { components: [], edges: [] };
  }

  const nodes: ArchitectureComponent[] = [];
  const edges: ArchitectureEdge[] = [];

  // Group files into categories
  const entryFiles: string[] = [];
  const coreFiles: string[] = [];
  const dataFiles: string[] = [];
  const uiFiles: string[] = [];

  files.forEach((f) => {
    const p = f.path.toLowerCase();
    const name = f.path.split("/").pop() || f.path;

    if (
      name.startsWith("main.") ||
      name.startsWith("app.") ||
      name.startsWith("server.") ||
      name.startsWith("index.")
    ) {
      entryFiles.push(f.path);
    } else if (p.includes("store") || p.includes("db") || p.includes("model") || p.includes("data")) {
      dataFiles.push(f.path);
    } else if (p.includes("component") || p.includes("ui") || p.includes("view") || p.includes("page")) {
      uiFiles.push(f.path);
    } else {
      coreFiles.push(f.path);
    }
  });

  let nextId = 1;

  // 1. Entry Point Node
  const entryNodeId = "node_entry";
  const entryLabel = entryFiles[0] ? entryFiles[0].split("/").pop() || "main" : `${repoName} Entry`;
  nodes.push({
    id: entryNodeId,
    label: entryLabel,
    sublabel: "Application Entry Point",
    tech: entryFiles[0]?.endsWith(".py") ? "Python / FastAPI" : "TypeScript / Next.js",
    type: "entry",
    color: "#1a5c38",
    x: 60,
    y: 180,
  });

  // 2. Core Modules Node
  if (coreFiles.length > 0) {
    const coreNodeId = "node_core";
    nodes.push({
      id: coreNodeId,
      label: "Core Services & API",
      sublabel: `${coreFiles.length} modules analyzed`,
      tech: "Business Logic",
      type: "core",
      color: "#2563eb",
      x: 280,
      y: 100,
    });
    edges.push({ from: entryNodeId, to: coreNodeId, type: "direct" });

    // Individual core files (up to 3)
    coreFiles.slice(0, 3).forEach((cf, idx) => {
      const fn = cf.split("/").pop() || cf;
      const subId = `node_core_${idx}`;
      nodes.push({
        id: subId,
        label: fn,
        sublabel: cf,
        tech: "Core Logic",
        type: "subcore",
        color: "#3b82f6",
        x: 520,
        y: 60 + idx * 80,
      });
      edges.push({ from: coreNodeId, to: subId, type: "direct" });
    });
  }

  // 3. UI & Frontend Node
  if (uiFiles.length > 0) {
    const uiNodeId = "node_ui";
    nodes.push({
      id: uiNodeId,
      label: "UI & Layout Layer",
      sublabel: `${uiFiles.length} component files`,
      tech: "React / Tailwind",
      type: "ui",
      color: "#d97706",
      x: 280,
      y: 280,
    });
    edges.push({ from: entryNodeId, to: uiNodeId, type: "direct" });

    // Individual UI files (up to 2)
    uiFiles.slice(0, 2).forEach((uf, idx) => {
      const fn = uf.split("/").pop() || uf;
      const subId = `node_ui_${idx}`;
      nodes.push({
        id: subId,
        label: fn,
        sublabel: uf,
        tech: "Component",
        type: "subui",
        color: "#f59e0b",
        x: 520,
        y: 300 + idx * 80,
      });
      edges.push({ from: uiNodeId, to: subId, type: "direct" });
    });
  }

  // 4. Data / Store Node
  if (dataFiles.length > 0) {
    const dataNodeId = "node_data";
    nodes.push({
      id: dataNodeId,
      label: "State & Data Layer",
      sublabel: `${dataFiles.length} state schemas`,
      tech: "State / Storage",
      type: "data",
      color: "#7c3aed",
      x: 280,
      y: 440,
    });
    edges.push({ from: entryNodeId, to: dataNodeId, type: "indirect" });
  }

  return { components: nodes, edges };
}

export default function ArchitecturePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { getProject } = useAppStore();
  const router = useRouter();
  const project = getProject(id);

  const [zoom, setZoom] = useState(100);
  const [selected, setSelected] = useState<ArchitectureComponent | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  const { components, edges } = useMemo(() => {
    if (!project) return { components: [], edges: [] };
    if (project.architectureComponents && project.architectureComponents.length > 0) {
      return {
        components: project.architectureComponents,
        edges: project.architectureEdges,
      };
    }
    return generateArchitectureFromFiles(project.files, project.name);
  }, [project]);

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-24 text-center px-8">
        <div className="text-3xl mb-3">🔍</div>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
          Project not found
        </h2>
        <button
          onClick={() => router.push("/dashboard")}
          className="px-4 py-2 bg-[#1a5c38] text-white rounded-lg text-xs font-medium hover:bg-[#145230] transition-colors"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  const activeComp = selected ?? components[0] ?? null;

  return (
    <div className="h-full flex flex-col bg-white dark:bg-[#0f172a] transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-[#0f172a] flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Architecture Map</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Interactive module graph extracted from repository analysis.
          </p>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {components.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-gray-50/40 dark:bg-gray-900/40">
            <div className="w-14 h-14 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center mb-4 shadow-sm">
              <GitBranch size={24} className="text-[#1a5c38] dark:text-green-400" />
            </div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
              Architecture Analysis Pending
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mb-6 leading-relaxed">
              Run repository analysis to generate an interactive dependency and architecture diagram.
            </p>
            <div className="inline-flex items-center gap-2 border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 rounded-lg px-4 py-2 text-xs text-gray-600 dark:text-gray-300">
              <Layers size={14} className="text-gray-400" />
              <span>
                Target Repository: <strong>{project.owner}/{project.repo}</strong>
              </span>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center gap-2 px-6 py-3 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-[#0f172a] flex-shrink-0">
              <button
                onClick={() => setZoom(100)}
                className="flex items-center gap-1.5 border border-gray-200 dark:border-gray-700 rounded-md px-3 py-1.5 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
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
              <div className="text-xs text-gray-400 ml-auto font-mono">
                {components.length} Modules · {edges.length} Dependencies
              </div>
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
                  const to = components.find((c) => c.id === edge.to);
                  if (!from || !to) return null;

                  const isConnectedToHovered =
                    hoveredNodeId !== null &&
                    (edge.from === hoveredNodeId || edge.to === hoveredNodeId);

                  return (
                    <line
                      key={i}
                      x1={from.x + 60}
                      y1={from.y + 30}
                      x2={to.x + 60}
                      y2={to.y + 30}
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
                        width="130"
                        height="60"
                        rx="8"
                        className="fill-white dark:fill-gray-900 transition-all duration-200 shadow-sm"
                        stroke={isSelected || isHovered ? comp.color : "#e5e7eb"}
                        strokeWidth={isSelected || isHovered ? 2.5 : 1.5}
                      />
                      <rect x="8" y="10" width="22" height="22" rx="4" fill={comp.color} opacity="0.15" />
                      <text x="19" y="24" textAnchor="middle" fill={comp.color} fontSize="10" fontWeight="bold">
                        {"</>"}
                      </text>
                      <text x="65" y="24" textAnchor="middle" className="fill-gray-900 dark:fill-gray-100 text-[10px] font-semibold">
                        {comp.label}
                      </text>
                      <text x="65" y="37" textAnchor="middle" className="fill-gray-500 dark:fill-gray-400 text-[8px]">
                        {comp.sublabel}
                      </text>
                      <text x="65" y="50" textAnchor="middle" className="fill-gray-400 dark:fill-gray-500 text-[7px]">
                        {comp.tech}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        )}

        {/* Details Panel */}
        {activeComp && components.length > 0 && (
          <div className="w-[260px] border-l border-gray-100 dark:border-gray-800 bg-white dark:bg-[#0f172a] overflow-y-auto p-5 flex-shrink-0">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-4">
              Module Info
            </div>
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-7 h-7 rounded-md flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
                style={{ backgroundColor: activeComp.color }}
              >
                {"</>"}
              </div>
              <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                {activeComp.label}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">
              {activeComp.sublabel}
            </p>
            <div className="text-xs text-gray-400 mb-1">Layer / Tech</div>
            <div className="text-xs border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded px-2 py-1 text-gray-700 dark:text-gray-300 font-mono inline-block">
              {activeComp.tech}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
