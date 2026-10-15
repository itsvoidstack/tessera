"use client";

import { use } from "react";
import { useAppStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import MindPlannerCanvas from "@/components/MindPlannerCanvas";

export default function ProjectPlannerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { getProject } = useAppStore();
  const router = useRouter();

  const project = getProject(id);

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-24 text-center px-8">
        <div className="text-3xl mb-3">🔍</div>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
          Project not found
        </h2>
        <button
          onClick={() => router.push("/dashboard")}
          className="px-4 py-2 bg-[#1a5c38] text-white rounded-lg text-xs font-medium hover:bg-[#145230] transition-colors mt-4"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto page-enter">
      <MindPlannerCanvas
        projectId={project.id}
        repoUrl={project.repoUrl}
        repoName={project.name}
        files={project.files}
      />
    </div>
  );
}
