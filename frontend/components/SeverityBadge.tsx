"use client";

type Severity = "Critical" | "High" | "Medium" | "Low" | "Improvement";

interface SeverityBadgeProps {
  severity: Severity | string;
}

const styles: Record<string, string> = {
  Critical: "bg-red-50 text-red-600 border border-red-200",
  High: "bg-orange-50 text-orange-600 border border-orange-200",
  Medium: "bg-yellow-50 text-yellow-700 border border-yellow-200",
  Low: "bg-gray-100 text-gray-600 border border-gray-200",
  Improvement: "bg-green-50 text-green-700 border border-green-200",
};

export default function SeverityBadge({ severity }: SeverityBadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
        styles[severity] ?? "bg-gray-100 text-gray-600"
      }`}
    >
      {severity}
    </span>
  );
}
