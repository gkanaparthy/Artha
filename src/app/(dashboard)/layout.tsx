import { AppSidebar } from "@/components/layout/app-sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Header } from "@/components/layout/header";
import { FilterProvider } from "@/contexts/filter-context";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <FilterProvider>
      <div className="flex bg-background h-screen w-full overflow-hidden text-foreground relative">
        {/* Ambient Background Effects */}
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-10%] right-[-5%] w-[40vw] h-[40vw] rounded-full bg-primary/5 blur-[120px] mix-blend-multiply dark:mix-blend-screen animate-pulse duration-[10000ms]" />
          <div className="absolute bottom-[-10%] left-[-5%] w-[30vw] h-[30vw] rounded-full bg-blue-500/5 blur-[100px] mix-blend-multiply dark:mix-blend-screen" />
        </div>

        {/* Mobile Navigation */}
        <MobileNav />

        {/* Desktop Sidebar */}
        <div className="z-10 h-full flex-none hidden md:block">
          <AppSidebar />
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-background/40 backdrop-blur-[2px] z-10 relative pt-14 md:pt-0">
          <Header />
          <main className="flex-1 overflow-auto p-4 md:p-6 scroll-smooth">
            {children}
          </main>
        </div>
      </div>
    </FilterProvider>
  );
}
