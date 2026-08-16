"use client";

interface MiniTrendChartProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  fillColor?: string;
  labels?: string[];
}

export default function MiniTrendChart({
  data,
  width = 480,
  height = 120,
  color = "#1a5c38",
  fillColor = "rgba(26,92,56,0.08)",
  labels,
}: MiniTrendChartProps) {
  if (!data || data.length < 2) return null;

  const min = Math.min(...data) - 5;
  const max = Math.max(...data) + 5;
  const range = max - min;

  const padX = 0;
  const padY = 8;
  const chartW = width - padX * 2;
  const chartH = height - padY * 2;

  const toX = (i: number) => padX + (i / (data.length - 1)) * chartW;
  const toY = (v: number) => padY + chartH - ((v - min) / range) * chartH;

  const points = data.map((v, i) => `${toX(i)},${toY(v)}`).join(" ");
  const lastX = toX(data.length - 1);
  const lastY = toY(data[data.length - 1]);

  // Closed path for fill
  const fillPath = `M ${toX(0)},${toY(data[0])} ${data
    .slice(1)
    .map((v, i) => `L ${toX(i + 1)},${toY(v)}`)
    .join(" ")} L ${lastX},${padY + chartH} L ${toX(0)},${padY + chartH} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      preserveAspectRatio="none"
    >
      {/* Fill */}
      <path d={fillPath} fill={fillColor} />
      {/* Line */}
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* Last point dot */}
      <circle cx={lastX} cy={lastY} r="4" fill={color} />
      {/* Last value label */}
      <rect
        x={lastX - 18}
        y={lastY - 22}
        width="36"
        height="18"
        rx="4"
        fill={color}
      />
      <text
        x={lastX}
        y={lastY - 9}
        textAnchor="middle"
        fill="white"
        fontSize="11"
        fontWeight="600"
        fontFamily="inherit"
      >
        {data[data.length - 1]}
      </text>
      {/* X-axis labels */}
      {labels &&
        labels.map((label, i) => (
          <text
            key={label}
            x={toX(i)}
            y={height - 1}
            textAnchor="middle"
            fill="#9ca3af"
            fontSize="10"
            fontFamily="inherit"
          >
            {label}
          </text>
        ))}
    </svg>
  );
}
