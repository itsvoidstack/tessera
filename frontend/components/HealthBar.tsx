"use client";

interface HealthBarProps {
  score: number;
  height?: number;
}

function getColor(score: number) {
  if (score >= 80) return "#1a5c38";
  if (score >= 60) return "#d97706";
  return "#dc2626";
}

export default function HealthBar({ score, height = 6 }: HealthBarProps) {
  return (
    <div
      className="w-full rounded-full bg-gray-100 overflow-hidden"
      style={{ height }}
    >
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${score}%`, backgroundColor: getColor(score) }}
      />
    </div>
  );
}
