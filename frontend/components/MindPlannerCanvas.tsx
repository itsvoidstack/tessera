"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import {
  Compass, Sparkles, Layers, Terminal, Database, Clock,
  FileCode, Copy, Check, RefreshCw, ZoomIn, ZoomOut, Move,
  Maximize2, ArrowRight, ShieldAlert, CheckCircle2, ChevronRight,
  ExternalLink, Download
} from "lucide-react";
import {
  generateMindPlan,
  MindPlan,
  MindPlanNode,
  MindPlanEdge,
} from "@/lib/api-client";
import { useToast } from "@/hooks/useToast";
import Toast from "@/components/Toast";

const INSPIRATION_IDEAS = [
  "AI Voice Assistant for Drive-Thrus with Offline Fallback",
  "Real-Time Collaborative Code Review Studio",
  "High-Throughput Web3 Payment Gateway & Escrow",
  "Autonomous DevOps Incident Triage Agent",
  "Micro-SaaS Multi-Tenant Billing & Usage Engine",
];

interface MindPlannerCanvasProps {
  initialPrompt?: string;
  projectId?: string;
  repoUrl?: string;
  repoName?: string;
  files?: Array<{ path: string; size: number; content: string }>;
}

export default function MindPlannerCanvas({
  initialPrompt,
  projectId,
  repoUrl,
  repoName,
  files,
}: MindPlannerCanvasProps) {
  const { toasts, toast, dismiss } = useToast();

  const [prompt, setPrompt] = useState(
    initialPrompt ||
      (repoName
        ? `Architectural modernization and feature expansion roadmap for ${repoName}`
        : "AI-Powered Software Intelligence and Development Assistant")
  );

  const [plan, setPlan] = useState<MindPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"map" | "tech" | "db" | "roadmap" | "files">("map");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Canvas zoom & pan
  const [zoom, setZoom] = useState(1);
  const [copiedBlueprint, setCopiedBlueprint] = useState(false);

  // Dragging state for nodes
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>({});
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Cache loading
  useEffect(() => {
    const cacheKey = projectId
      ? `tessera_mind_plan_${projectId}`
      : "tessera_global_mind_plan";
    const cached = localStorage.getItem(cacheKey);

    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setPlan(parsed);
        initNodePositions(parsed.nodes);
        return;
      } catch {
        // silent
      }
    }

    // Otherwise run initial blueprint generation
    handleGeneratePlan();
  }, [projectId]);

  function initNodePositions(nodes: MindPlanNode[]) {
    const posMap: Record<string, { x: number; y: number }> = {};
    nodes.forEach((n, idx) => {
      // If node coords are out of bounds, distribute nicely
      const x = n.x && n.x > 30 && n.x < 1100 ? n.x : 60 + (idx % 4) * 230;
      const y = n.y && n.y > 30 && n.y < 650 ? n.y : 80 + Math.floor(idx / 4) * 150;
      posMap[n.id] = { x, y };
    });
    setNodePositions(posMap);
    if (nodes.length > 0) {
      setSelectedNodeId(nodes[0].id);
    }
  }

  async function handleGeneratePlan(overridePrompt?: string) {
    const p = overridePrompt || prompt;
    if (!p.trim()) {
      toast("Please enter an idea prompt or feature requirement.", "error");
      return;
    }

    setLoading(true);
    try {
      const res = await generateMindPlan(p, repoUrl, undefined, files);
      if (res.plan) {
        setPlan(res.plan);
        initNodePositions(res.plan.nodes);

        const cacheKey = projectId
          ? `tessera_mind_plan_${projectId}`
          : "tessera_global_mind_plan";
        localStorage.setItem(cacheKey, JSON.stringify(res.plan));
        toast("Architecture Blueprint synthesized with Gemini", "success");
      }
    } catch (err: any) {
      toast(err.message || "Failed to generate blueprint. Showing baseline.", "error");
    } finally {
      setLoading(false);
    }
  }

  // Node Drag handlers
  function handleNodeMouseDown(e: React.MouseEvent, nodeId: string) {
    e.stopPropagation();
    setDraggingNodeId(nodeId);
    setSelectedNodeId(nodeId);

    const pos = nodePositions[nodeId] || { x: 0, y: 0 };
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

    setNodePositions((prev) => ({
      ...prev,
      [draggingNodeId]: { x: Math.max(30, Math.min(1050, newX)), y: Math.max(30, Math.min(650, newY)) },
    }));
  }

  function handleSvgMouseUp() {
    setDraggingNodeId(null);
  }

  const selectedNode = useMemo(() => {
    if (!plan || !selectedNodeId) return null;
    return plan.nodes.find((n) => n.id === selectedNodeId) || plan.nodes[0] || null;
  }, [plan, selectedNodeId]);

  function exportBlueprintMarkdown() {
    if (!plan) return;

    let md = `# Architecture Blueprint: ${plan.title}\n\n`;
    md += `> **${plan.tagline}**\n\n`;
    md += `## System Overview\n${plan.overview}\n\n`;

    md += `## Tech Stack Decision Matrix\n`;
    md += `| Layer | Technology | Rationale | Operational Trade-off |\n`;
    md += `| :--- | :--- | :--- | :--- |\n`;
    plan.tech_stack?.forEach((t) => {
      md += `| **${t.layer}** | ${t.technology} | ${t.rationale} | ${t.trade_off} |\n`;
    });
    md += `\n`;

    md += `## Database Schemas\n`;
    plan.database_schema?.forEach((s) => {
      md += `### Table: \`${s.table}\`\n`;
      md += `- **Relations**: ${s.relations}\n`;
      md += `- **Fields**:\n`;
      s.fields.forEach((f) => {
        md += `  - \`${f}\`\n`;
      });
      md += `\n`;
    });

    md += `## Phased Implementation Sprint Roadmap\n`;
    plan.roadmap?.forEach((r) => {
      md += `### ${r.phase} (${r.time_estimate})\n`;
      md += `**Focus**: ${r.focus}\n\n`;
      r.deliverables.forEach((d) => {
        md += `- [ ] ${d}\n`;
      });
      md += `\n`;
    });

    navigator.clipboard.writeText(md);
    setCopiedBlueprint(true);
    toast("Complete blueprint markdown copied to clipboard!", "success");
    setTimeout(() => setCopiedBlueprint(false), 2500);
  }

  return (
    <div className="space-y-6">
      {/* Search / Prompt Generator Bar */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-900 dark:text-white">
            <Compass size={16} className="text-[#1a5c38] dark:text-emerald-400" />
            <span>Idea to Architecture Studio</span>
            <span className="text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800">
              Gemini Powered
            </span>
          </div>

          <button
            onClick={exportBlueprintMarkdown}
            disabled={!plan}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-white transition-colors"
          >
            {copiedBlueprint ? <Check size={13} /> : <Copy size={13} />}
            {copiedBlueprint ? "Copied Blueprint!" : "Copy Blueprint (MD)"}
          </button>
        </div>

        {/* Input Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleGeneratePlan()}
            placeholder="Describe any idea, app concept, or architectural refactor..."
            className="flex-1 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-xs text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
          />
          <button
            onClick={() => handleGeneratePlan()}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#1a5c38] hover:bg-[#14482c] text-white rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50 flex-shrink-0"
          >
            <Sparkles size={14} className={loading ? "animate-spin" : ""} />
            {loading ? "Generating Blueprint..." : "Generate Architecture"}
          </button>
        </div>

        {/* Inspiration Chips */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[10px] text-gray-400 font-medium">Inspiration:</span>
          {INSPIRATION_IDEAS.map((idea, idx) => (
            <button
              key={idx}
              onClick={() => {
                setPrompt(idea);
                handleGeneratePlan(idea);
              }}
              className="text-[10px] bg-gray-100 dark:bg-gray-800/70 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-700 dark:hover:text-emerald-300 text-gray-600 dark:text-gray-300 px-2.5 py-1 rounded-full transition-colors border border-transparent hover:border-emerald-200 dark:hover:border-emerald-800"
            >
              {idea}
            </button>
          ))}
        </div>
      </div>

      {/* Blueprint Header Banner */}
      {plan && (
        <div className="p-5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {plan.title}
            </h2>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800 self-start sm:self-auto">
              {plan.tagline}
            </span>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed max-w-4xl">
            {plan.overview}
          </p>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 pt-3 border-t border-gray-100 dark:border-gray-800 overflow-x-auto">
            {[
              { id: "map", label: "Architecture Mindmap", icon: Compass },
              { id: "tech", label: "Tech Stack & Gotchas", icon: Terminal },
              { id: "db", label: "Database Schema", icon: Database },
              { id: "roadmap", label: "Sprint Roadmap", icon: Clock },
              { id: "files", label: "Scaffold File Tree", icon: FileCode },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                    isActive
                      ? "bg-[#1a5c38] text-white shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
                >
                  <Icon size={13} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Tab 1: Visual Architecture Mindmap ──────────────────────── */}
      {activeTab === "map" && plan && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* SVG Visual Canvas (3 cols) */}
          <div className="lg:col-span-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm relative h-[560px] flex flex-col">
            
            {/* Canvas Toolbar */}
            <div className="absolute top-3 left-4 z-10 flex items-center gap-2 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-800 text-xs shadow-sm">
              <span className="font-semibold text-gray-700 dark:text-gray-300">Canvas</span>
              <span className="text-gray-300 dark:text-gray-700">|</span>
              <button
                onClick={() => setZoom((z) => Math.min(z + 0.15, 1.8))}
                className="p-1 hover:text-emerald-600 text-gray-500"
                title="Zoom In"
              >
                <ZoomIn size={14} />
              </button>
              <button
                onClick={() => setZoom((z) => Math.max(z - 0.15, 0.6))}
                className="p-1 hover:text-emerald-600 text-gray-500"
                title="Zoom Out"
              >
                <ZoomOut size={14} />
              </button>
              <button
                onClick={() => setZoom(1)}
                className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 font-mono"
              >
                {Math.round(zoom * 100)}%
              </button>
              <span className="text-[11px] text-gray-400 ml-2">Drag nodes to rearrange</span>
            </div>

            {/* Layer Reference Legend */}
            <div className="absolute bottom-3 left-4 z-10 hidden sm:flex items-center gap-3 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-800 text-[10px] text-gray-500 shadow-sm">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#1a5c38]"></span> Client / Entry</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#2563eb]"></span> API Core</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#7c3aed]"></span> AI Worker</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#d97706]"></span> Primary DB</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#0891b2]"></span> Cache / Queue</span>
            </div>

            {/* SVG Canvas Area */}
            <div className="flex-1 w-full h-full overflow-hidden bg-gray-50/50 dark:bg-[#070b12] relative cursor-crosshair">
              <svg
                ref={svgRef}
                className="w-full h-full"
                viewBox="0 0 1100 650"
                onMouseMove={handleSvgMouseMove}
                onMouseUp={handleSvgMouseUp}
                style={{ transform: `scale(${zoom})`, transformOrigin: "0 0" }}
              >
                <defs>
                  {/* Arrowhead marker */}
                  <marker
                    id="arrowhead-direct"
                    markerWidth="8"
                    markerHeight="8"
                    refX="6"
                    refY="4"
                    orient="auto"
                  >
                    <polygon points="0 1, 7 4, 0 7" fill="#64748b" />
                  </marker>
                  <marker
                    id="arrowhead-selected"
                    markerWidth="8"
                    markerHeight="8"
                    refX="6"
                    refY="4"
                    orient="auto"
                  >
                    <polygon points="0 1, 7 4, 0 7" fill="#10b981" />
                  </marker>
                  {/* Grid pattern */}
                  <pattern
                    id="planner-grid"
                    width="40"
                    height="40"
                    patternUnits="userSpaceOnUse"
                  >
                    <circle cx="20" cy="20" r="0.8" fill="rgba(100, 116, 139, 0.2)" />
                  </pattern>
                </defs>

                {/* Grid Background */}
                <rect width="1100" height="650" fill="url(#planner-grid)" />

                {/* Render Edges */}
                {plan.edges?.map((edge, idx) => {
                  const fromPos = nodePositions[edge.from] || { x: 100, y: 100 };
                  const toPos = nodePositions[edge.to] || { x: 300, y: 300 };

                  // Start at right center of source, end at left center of target
                  const x1 = fromPos.x + 160;
                  const y1 = fromPos.y + 40;
                  const x2 = toPos.x;
                  const y2 = toPos.y + 40;

                  const dx = Math.abs(x2 - x1) * 0.5;
                  const pathD = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;

                  const isConnectedToSelected =
                    selectedNodeId && (edge.from === selectedNodeId || edge.to === selectedNodeId);

                  return (
                    <g key={idx}>
                      <path
                        d={pathD}
                        fill="none"
                        stroke={isConnectedToSelected ? "#10b981" : "#94a3b8"}
                        strokeWidth={isConnectedToSelected ? 2.5 : 1.5}
                        strokeDasharray={edge.type === "indirect" ? "4 4" : undefined}
                        markerEnd={isConnectedToSelected ? "url(#arrowhead-selected)" : "url(#arrowhead-direct)"}
                        className="transition-all duration-200"
                        opacity={isConnectedToSelected ? 1 : 0.65}
                      />
                    </g>
                  );
                })}

                {/* Render Interactive Nodes */}
                {plan.nodes?.map((node) => {
                  const pos = nodePositions[node.id] || { x: 100, y: 100 };
                  const isSelected = selectedNodeId === node.id;
                  const isDragging = draggingNodeId === node.id;

                  return (
                    <g
                      key={node.id}
                      transform={`translate(${pos.x}, ${pos.y})`}
                      onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                      className="cursor-move select-none"
                    >
                      {/* Node Box */}
                      <rect
                        width="160"
                        height="80"
                        rx="12"
                        className={`transition-shadow ${
                          isSelected
                            ? "fill-white dark:fill-gray-900 stroke-emerald-500 shadow-lg"
                            : "fill-white dark:fill-gray-900 stroke-gray-200 dark:stroke-gray-700"
                        }`}
                        strokeWidth={isSelected ? "2.5" : "1.2"}
                      />

                      {/* Top Accent Strip */}
                      <rect
                        width="160"
                        height="4"
                        rx="2"
                        fill={node.color || "#1a5c38"}
                      />

                      {/* Node Label */}
                      <text
                        x="14"
                        y="28"
                        className="text-xs font-bold fill-gray-900 dark:fill-white"
                        style={{ fontSize: "12px", fontWeight: "700" }}
                      >
                        {node.label.length > 18 ? node.label.slice(0, 18) + "…" : node.label}
                      </text>

                      {/* Tech / Framework Badge */}
                      <text
                        x="14"
                        y="48"
                        className="fill-gray-500 dark:fill-gray-400"
                        style={{ fontSize: "10px", fontWeight: "500" }}
                      >
                        {node.tech.length > 20 ? node.tech.slice(0, 20) + "…" : node.tech}
                      </text>

                      {/* Sublabel / Responsibility */}
                      <text
                        x="14"
                        y="66"
                        className="fill-emerald-600 dark:fill-emerald-400 font-mono"
                        style={{ fontSize: "9px" }}
                      >
                        {node.type.toUpperCase()}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Right Column: Node Inspector Drawer (1 col) */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-gray-100 dark:border-gray-800">
              <Layers size={14} className="text-emerald-600" />
              Component Inspector
            </h3>

            {selectedNode ? (
              <div className="space-y-4 text-xs">
                <div>
                  <span className="text-[10px] text-gray-400 font-mono uppercase">Name</span>
                  <div className="text-sm font-bold text-gray-900 dark:text-white mt-0.5">
                    {selectedNode.label}
                  </div>
                  <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono">
                    ID: {selectedNode.id}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-gray-400 font-mono uppercase">Primary Technology</span>
                  <div className="text-xs font-semibold text-gray-800 dark:text-gray-200 mt-0.5 bg-gray-50 dark:bg-gray-800 p-2 rounded-lg border border-gray-100 dark:border-gray-700">
                    {selectedNode.tech}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-gray-400 font-mono uppercase">Layer Responsibility</span>
                  <p className="text-[11px] text-gray-600 dark:text-gray-300 mt-0.5 leading-relaxed">
                    {selectedNode.sublabel || "Core architectural component handling input and domain execution."}
                  </p>
                </div>

                {/* Connections list */}
                <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                  <span className="text-[10px] text-gray-400 font-mono uppercase">Data Connections</span>
                  <div className="mt-1.5 space-y-1">
                    {plan.edges
                      ?.filter((e) => e.from === selectedNode.id || e.to === selectedNode.id)
                      .map((edge, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-1.5 rounded bg-gray-50 dark:bg-gray-800/60 text-[10px] text-gray-700 dark:text-gray-300"
                        >
                          <span>{edge.from === selectedNode.id ? `Sends to → ${edge.to}` : `Receives from ← ${edge.from}`}</span>
                          <span className="font-mono text-gray-400">{edge.type}</span>
                        </div>
                      )) || (
                      <div className="text-[11px] text-gray-400">No explicit edges configured</div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-400">Click any node on the canvas to inspect its details.</p>
            )}
          </div>
        </div>
      )}

      {/* ── Tab 2: Tech Stack Decision Matrix ────────────────────────── */}
      {activeTab === "tech" && plan && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Terminal size={16} className="text-blue-500" />
                Tech Stack Architecture &amp; Operational Gotchas
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Evaluated technologies with explicit trade-offs and operational caveats.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {plan.tech_stack?.map((item, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-gray-400 font-mono tracking-wider">
                    {item.layer}
                  </span>
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-900/50">
                    {item.technology}
                  </span>
                </div>

                <div>
                  <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Why Selected</div>
                  <p className="text-xs text-gray-700 dark:text-gray-300 mt-0.5">
                    {item.rationale}
                  </p>
                </div>

                <div className="p-2.5 rounded-lg bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-300 text-[11px]">
                    <ShieldAlert size={12} />
                    <span>Known Trade-off &amp; Gotcha:</span>
                  </div>
                  <p className="text-[11px] text-amber-800 dark:text-amber-300/90 mt-0.5">
                    {item.trade_off}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Tab 3: Database & Entity Schemas ─────────────────────────── */}
      {activeTab === "db" && plan && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Database size={16} className="text-amber-500" />
              Entity Relational Model &amp; Database Schemas
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Production data models with typed primary keys, foreign constraints, and indices.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plan.database_schema?.map((schema, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden bg-white dark:bg-gray-900 shadow-sm"
              >
                <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-900 dark:text-white font-mono">
                    {schema.table}
                  </span>
                  <span className="text-[10px] text-gray-400 font-mono">TABLE</span>
                </div>

                <div className="p-4 space-y-3">
                  <div className="space-y-1">
                    {schema.fields.map((field, fIdx) => (
                      <div
                        key={fIdx}
                        className="text-[11px] font-mono text-gray-700 dark:text-gray-300 py-0.5 flex items-center justify-between border-b border-gray-50 dark:border-gray-800/40 last:border-0"
                      >
                        <span>{field.split(":")[0]}</span>
                        <span className="text-gray-400">{field.split(":")[1] || ""}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Relationships</span>
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
                      {schema.relations}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Tab 4: Phased Sprint Roadmap ─────────────────────────────── */}
      {activeTab === "roadmap" && plan && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Clock size={16} className="text-purple-500" />
              Phased Implementation Sprint Roadmap
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Structured sprint plan designed for rapid hackathon execution and production handover.
            </p>
          </div>

          <div className="space-y-4">
            {plan.roadmap?.map((phase, idx) => (
              <div
                key={idx}
                className="p-5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-950/60 px-2.5 py-0.5 rounded-full">
                      {phase.phase}
                    </span>
                    <span className="text-xs text-gray-400 font-mono">
                      ⏱ {phase.time_estimate}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                    Focus: {phase.focus}
                  </h4>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {phase.deliverables.map((d, dIdx) => (
                      <span
                        key={dIdx}
                        className="text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 px-2.5 py-1 rounded-lg flex items-center gap-1.5"
                      >
                        <CheckCircle2 size={12} className="text-emerald-500" />
                        {d}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Tab 5: Scaffold File Tree ────────────────────────────────── */}
      {activeTab === "files" && plan && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <FileCode size={16} className="text-emerald-500" />
                Scaffold Project File Tree
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Directory tree skeleton and starter module structure.
              </p>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(plan.file_tree?.join("\n") || "");
                toast("File list copied to clipboard", "success");
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <Copy size={13} />
              Copy File List
            </button>
          </div>

          <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 font-mono text-xs text-gray-800 dark:text-gray-200 space-y-1">
            {plan.file_tree?.map((path, idx) => (
              <div key={idx} className="flex items-center gap-2 py-0.5">
                <span className="text-emerald-500">📁</span>
                <span>{path}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <Toast toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
