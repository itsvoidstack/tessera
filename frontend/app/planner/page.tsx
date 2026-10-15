"use client";

import AppTopBar from "@/components/AppTopBar";
import Sidebar from "@/components/Sidebar";
import PageTransition from "@/components/PageTransition";
import MindPlannerCanvas from "@/components/MindPlannerCanvas";

export default function GlobalPlannerPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#0b0f17] flex flex-col transition-colors">
      <AppTopBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar isDashboard={true} />

        <main className="flex-1 overflow-y-auto bg-gray-50/40 dark:bg-gray-950/40">
          <PageTransition>
            <div className="max-w-6xl mx-auto px-6 py-8">
              <MindPlannerCanvas />
            </div>
          </PageTransition>
        </main>
      </div>
    </div>
  );
}
