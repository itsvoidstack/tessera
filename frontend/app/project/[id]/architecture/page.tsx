"use client";

import { use, useState, useMemo, useRef, useEffect } from "react";
import { useAppStore, type ArchitectureComponent, type ArchitectureEdge } from "@/lib/store";
import { useRouter } from "next/navigation";
import {
  Maximize2, Minus, Plus, GitBranch, Layers, ExternalLink, Move, Code2
} from "lucide-react";

function generateArchitectureFromFiles(
  files: Array<{ path: string; size: number; content: string }> | undefined,
  repoName: string
): { components: ArchitectureComponent[]; edges: ArchitectureEdge[] } {
  if (!files || files.length === 0) {
    return { components: [], edges: [] };
  }

  const nodes: ArchitectureComponent[] = [];
  const edges: ArchitectureEdge[] = [];

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

  // Generous column spacing (260px) and row spacing (130px) to guarantee ZERO overlap
  const entryNodeId = "node_entry";
  const entryLabel = entryFiles[0] ? entryFiles[0].split("/").pop() || "main" : `${repoName} Entry`;
  nodes.push({
    id: entryNodeId,
    label: entryLabel,
    sublabel: entryFiles[0] || "Application Entry Point",
    tech: entryFiles[0]?.endsWith(".py") ? "Python / FastAPI" : "TypeScript / Next.js",
    type: "entry",
    color: "#1a5c38",
    x: 80,
    y: 220,
  });

  if (coreFiles.length > 0) {
    const coreNodeId = "node_core";
    nodes.push({
      id: coreNodeId,
      label: "Core Services & API",
      sublabel: `${coreFiles.length} modules analyzed`,
      tech: "Business Logic",
      type: "core",
      color: "#2563eb",
      x: 340,
      y: 90,
    });
    edges.push({ from: entryNodeId, to: coreNodeId, type: "direct" });

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
        x: 620,
        y: 40 + idx * 110,
      });
      edges.push({ from: coreNodeId, to: subId, type: "direct" });
    });
  }

  if (uiFiles.length > 0) {
    const uiNodeId = "node_ui";
    nodes.push({
      id: uiNodeId,
      label: "UI & Layout Layer",
      sublabel: `${uiFiles.length} component files`,
      tech: "React / Tailwind",
      type: "ui",
      color: "#d97706",
      x: 340,
      y: 350,
    });
    edges.push({ from: entryNodeId, to: uiNodeId, type: "direct" });

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
        x: 620,
        y: 370 + idx * 110,
      });
      edges.push({ from: uiNodeId, to: subId, type: "direct" });
    });
  }

  if (dataFiles.length > 0) {
    const dataNodeId = "node_data";
    nodes.push({
      id: dataNodeId,
      label: "State & Data Layer",
      sublabel: dataFiles[0] || `${dataFiles.length} state schemas`,
      tech: "State / Storage",
      type: "data",
      color: "#7c3aed",
      x: 340,
      y: 540,
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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Initial layout calculation
  const initialData = useMemo(() => {
    if (!project) return { components: [], edges: [] };
    if (project.architectureComponents && project.architectureComponents.length > 0) {
      return {
        components: project.architectureComponents,
        edges: project.architectureEdges,
      };
    }
    return generateArchitectureFromFiles(project.files, project.name);
  }, [project]);

  // Interactive Draggable Node Positions State
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    const posMap: Record<string, { x: number; y: number }> = {};
    initialData.components.forEach((c) => {
      posMap[c.id] = { x: c.x, y: c.y };
    });
    setPositions(posMap);
  }, [initialData]);

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

  const components = initialData.components;
  const edges = initialData.edges;

  const activeComp = useMemo(() => {
    if (!components.length) return null;
    return components.find((c) => c.id === selectedId) || components[0];
  }, [components, selectedId]);

  // Derive Real Incoming (Dependents) and Outgoing (Dependencies) relationships
  const outgoingDependencies = useMemo(() => {
    if (!activeComp) return [];
    return edges
      .filter((e) => e.from === activeComp.id)
      .map((e) => components.find((c) => c.id === e.to))
      .filter(Boolean) as ArchitectureComponent[];
  }, [activeComp, edges, components]);

  const incomingDependents = useMemo(() => {
    if (!activeComp) return [];
    return edges
      .filter((e) => e.to === activeComp.id)
      .map((e) => components.find((c) => c.id === e.from))
      .filter(Boolean) as ArchitectureComponent[];
  }, [activeComp, edges, components]);

  // Dragging event handlers
  function handleNodeMouseDown(e: React.MouseEvent, nodeId: string) {
    e.stopPropagation();
    setDraggingNodeId(nodeId);
    setSelectedId(nodeId);

    const pos = positions[nodeId] || { x: 0, y: 0 };
    if (svgRef.current) {
      const pt = svgRef.current.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const cursor = pt.matrixTransform(svgRef.current.getScreenCTM()?.inverse());
      dragOffsetRef.current = { x: cursor.x - pos.x, y: cursor.y - pos.y };
    }
  }

  function handleSvgMouseMove(e: React.MouseEvent) {
    if (!draggingNodeId || !svgRef.current) return;
    const pt = svgRef.current.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const cursor = pt.matrixTransform(svgRef.current.getScreenCTM()?.inverse());
    const newX = Math.round(cursor.x - dragOffsetRef.current.x);
    const newY = Math.round(cursor.y - dragOffsetRef.current.y);

    setPositions((prev) => ({
      ...prev,
      [draggingNodeId]: { x: newX, y: newY },
    }));
  }

  function handleSvgMouseUp() {
    setDraggingNodeId(null);
  }

  function openCodeExplorerForSelected() {
    if (!activeComp) return;
    const filePath = activeComp.sublabel.includes("/") ? activeComp.sublabel : activeComp.label;
    router.push(`/project/${id}/code-explorer?file=${encodeURIComponent(filePath)}`);
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-[#0f172a] transition-colors select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-[#0f172a] flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Architecture Map</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Interactive module graph extracted from repository analysis. Click and drag nodes to rearrange layout.
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
              Run repository analysis to generate an interactive dependency diagram.
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
              <div className="text-xs text-gray-400 ml-auto font-mono flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-gray-500">
                  <Move size={12} /> Drag nodes to move
                </span>
                <span>• {components.length} Modules</span>
              </div>
            </div>

            {/* SVG Diagram Canvas */}
            <div className="flex-1 overflow-hidden bg-white dark:bg-[#0b0f17] relative">
              <svg
                ref={svgRef}
                viewBox="0 0 950 680"
                className="w-full h-full"
                style={{ transform: `scale(${zoom / 100})`, transformOrigin: "center" }}
                onMouseMove={handleSvgMouseMove}
                onMouseUp={handleSvgMouseUp}
                onMouseLeave={handleSvgMouseUp}
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
                <rect width="950" height="680" fill="url(#dots)" />

                {/* Dynamic Edges */}
                {edges.map((edge, i) => {
                  const fromComp = components.find((c) => c.id === edge.from);
                  const toComp = components.find((c) => c.id === edge.to);
                  if (!fromComp || !toComp) return null;

                  const fromPos = positions[fromComp.id] || { x: fromComp.x, y: fromComp.y };
                  const toPos = positions[toComp.id] || { x: toComp.x, y: toComp.y };

                  const isConnectedToHovered =
                    hoveredNodeId !== null &&
                    (edge.from === hoveredNodeId || edge.to === hoveredNodeId);
                  const isConnectedToSelected =
                    activeComp !== null &&
                    (edge.from === activeComp.id || edge.to === activeComp.id);

                  const highlight = isConnectedToHovered || isConnectedToSelected;

                  return (
                    <line
                      key={i}
                      x1={fromPos.x + 70}
                      y1={fromPos.y + 30}
                      x2={toPos.x + 70}
                      y2={toPos.y + 30}
                      stroke={highlight ? "#1a5c38" : "#d1d5db"}
                      strokeWidth={highlight ? "2.5" : "1.5"}
                      strokeDasharray={edge.type === "indirect" ? "5,4" : undefined}
                      markerEnd={highlight ? "url(#arrow-highlight)" : "url(#arrow)"}
                      className="transition-all duration-150"
                    />
                  );
                })}

                {/* Draggable Nodes */}
                {components.map((comp) => {
                  const pos = positions[comp.id] || { x: comp.x, y: comp.y };
                  const isSelected = activeComp?.id === comp.id;
                  const isHovered = hoveredNodeId === comp.id;
                  const isDragging = draggingNodeId === comp.id;

                  return (
                    <g
                      key={comp.id}
                      transform={`translate(${pos.x}, ${pos.y})`}
                      onMouseDown={(e) => handleNodeMouseDown(e, comp.id)}
                      onMouseEnter={() => setHoveredNodeId(comp.id)}
                      onMouseLeave={() => setHoveredNodeId(null)}
                      className={`cursor-grab ${isDragging ? "cursor-grabbing" : ""}`}
                    >
                      <rect
                        width="140"
                        height="60"
                        rx="8"
                        className="fill-white dark:fill-gray-900 transition-shadow duration-150 shadow-sm"
                        stroke={isSelected || isHovered ? comp.color : "#e5e7eb"}
                        strokeWidth={isSelected || isHovered ? 2.5 : 1.5}
                      />
                      <rect x="8" y="10" width="22" height="22" rx="4" fill={comp.color} opacity="0.15" />
                      <text x="19" y="24" textAnchor="middle" fill={comp.color} fontSize="10" fontWeight="bold">
                        {"</>"}
                      </text>
                      <text
                        x="72"
                        y="24"
                        textAnchor="middle"
                        className="fill-gray-900 dark:fill-gray-100 text-[10px] font-semibold"
                      >
                        {comp.label.length > 14 ? comp.label.slice(0, 14) + "..." : comp.label}
                      </text>
                      <text
                        x="72"
                        y="37"
                        textAnchor="middle"
                        className="fill-gray-500 dark:fill-gray-400 text-[8px]"
                      >
                        {comp.sublabel.length > 20 ? comp.sublabel.slice(0, 20) + "..." : comp.sublabel}
                      </text>
                      <text
                        x="72"
                        y="50"
                        textAnchor="middle"
                        className="fill-gray-400 dark:fill-gray-500 text-[7px]"
                      >
                        {comp.tech}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        )}

        {/* Detailed Module Info Panel */}
        {activeComp && components.length > 0 && (
          <div className="w-[280px] border-l border-gray-100 dark:border-gray-800 bg-white dark:bg-[#0f172a] flex flex-col flex-shrink-0 h-full overflow-hidden">
            {/* Scrollable details content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Module Info
              </div>
              <div className="flex items-center gap-2">
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
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed truncate">
                {activeComp.sublabel}
              </p>

              <div className="space-y-3 border-t border-gray-100 dark:border-gray-800 pt-3">
                <div>
                  <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1 font-semibold">
                    Layer / Tech
                  </div>
                  <div className="text-xs border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded px-2 py-1 text-gray-700 dark:text-gray-300 font-mono inline-block">
                    {activeComp.tech}
                  </div>
                </div>

                {/* Real Dependencies */}
                <div>
                  <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1 font-semibold">
                    Dependencies ({outgoingDependencies.length})
                  </div>
                  {outgoingDependencies.length === 0 ? (
                    <div className="text-xs text-gray-400 italic">None</div>
                  ) : (
                    <div className="space-y-1">
                      {outgoingDependencies.map((dep) => (
                        <div
                          key={dep.id}
                          onClick={() => setSelectedId(dep.id)}
                          className="text-xs text-[#1a5c38] dark:text-green-400 hover:underline cursor-pointer flex items-center gap-1 font-medium truncate"
                        >
                          → {dep.label}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Real Dependents */}
                <div>
                  <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1 font-semibold">
                    Dependents ({incomingDependents.length})
                  </div>
                  {incomingDependents.length === 0 ? (
                    <div className="text-xs text-gray-400 italic">None</div>
                  ) : (
                    <div className="space-y-1">
                      {incomingDependents.map((dep) => (
                        <div
                          key={dep.id}
                          onClick={() => setSelectedId(dep.id)}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer flex items-center gap-1 font-medium truncate"
                        >
                          ← {dep.label}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action button fixed at bottom of Module Info panel */}
            <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-[#0f172a] flex-shrink-0">
              <button
                onClick={openCodeExplorerForSelected}
                className="w-full flex items-center justify-center gap-1.5 bg-[#1a5c38] hover:bg-[#145230] dark:bg-green-600 dark:hover:bg-green-700 text-white rounded-lg py-2.5 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <Code2 size={14} /> Open in Code Explorer
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
