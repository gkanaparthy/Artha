import { DemoSidebar } from "@/components/layout/demo-sidebar";
import { DemoMobileNav } from "@/components/layout/demo-mobile-nav";
import { DemoHeader } from "@/components/layout/demo-header";
import { FilterProvider } from "@/contexts/filter-context";

export const metadata = {
  title: "Demo Mode | Artha Trading Journal",
  description: "Explore Artha with sample trading data - no sign up required",
};

export default function DemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <FilterProvider>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "Artha Demo",
            "applicationCategory": "FinanceApplication",
            "description": "Try the Artha trading journal with sample data. No sign-up required.",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "USD"
            }
          })
        }}
      />
      <div className="flex bg-background h-screen w-full overflow-hidden text-foreground relative">
        {/* Ambient Background Effects */}
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-10%] right-[-5%] w-[40vw] h-[40vw] rounded-full bg-amber-500/5 blur-[120px] mix-blend-multiply dark:mix-blend-screen animate-pulse duration-[10000ms]" />
          <div className="absolute bottom-[-10%] left-[-5%] w-[30vw] h-[30vw] rounded-full bg-blue-500/5 blur-[100px] mix-blend-multiply dark:mix-blend-screen" />
        </div>

        {/* Mobile Navigation */}
        <DemoMobileNav />

        {/* Desktop Sidebar */}
        <div className="z-10 h-full flex-none hidden md:block">
          <DemoSidebar />
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-background/40 backdrop-blur-[2px] z-10 relative pt-14 md:pt-0">
          <DemoHeader />
          <main className="flex-1 overflow-auto p-4 md:p-6 scroll-smooth">
            {children}
          </main>
        </div>
      </div>
    </FilterProvider>
  );
}
