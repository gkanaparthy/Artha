import { AppSidebar } from "@/components/layout/app-sidebar";
import { Header } from "@/components/layout/header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex bg-background h-screen w-full overflow-hidden text-foreground">
      <AppSidebar />
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-background/95">
        <Header />
        <main className="flex-1 overflow-auto p-6 scroll-smooth">
          {children}
        </main>
      </div>
    </div>
  );
}
