import { DashboardView } from "@/components/views/dashboard-view";
import { DEMO_METRICS, DEMO_POSITIONS } from "@/lib/demo-data";

export default function DemoDashboardPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            "name": "Artha Demo - Trading Journal Preview",
            "description": "Explore the Artha trading journal with sample data. See how your trades are tracked and analyzed.",
            "publisher": {
              "@type": "Organization",
              "name": "Artha"
            }
          })
        }}
      />
      <DashboardView
        initialMetrics={DEMO_METRICS}
        initialPositions={DEMO_POSITIONS}
        isDemo={true}
      />
    </>
  );
}
