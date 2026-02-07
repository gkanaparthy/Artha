import { ReportsView } from "@/components/views/reports-view";
import { DEMO_METRICS } from "@/lib/demo-data";

export default function DemoReportsPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            "name": "Artha Demo Reports - Performance Analytics",
            "description": "Explore sample performance reports in the Artha trading journal. See win rates, P&L charts, and more.",
            "publisher": {
              "@type": "Organization",
              "name": "Artha"
            }
          })
        }}
      />
      <ReportsView initialMetrics={DEMO_METRICS} isDemo={true} />
    </>
  );
}
