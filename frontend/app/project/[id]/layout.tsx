import AppTopBar from "@/components/AppTopBar";
import Sidebar from "@/components/Sidebar";
import PageTransition from "@/components/PageTransition";

interface ProjectLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export default async function ProjectLayout({
  children,
  params,
}: ProjectLayoutProps) {
  const { id } = await params;

  return (
    <div className="h-screen bg-white dark:bg-[#0b0f17] flex flex-col overflow-hidden transition-colors duration-200">
      <AppTopBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar projectId={id} />
        <main className="flex-1 overflow-y-auto bg-gray-50/30 dark:bg-[#0b0f17] transition-colors duration-200">
          <PageTransition>
            {children}
          </PageTransition>
        </main>
      </div>
    </div>
  );
}
