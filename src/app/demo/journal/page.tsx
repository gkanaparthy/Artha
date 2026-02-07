import { JournalView } from "@/components/views/journal-view";
import { DEMO_TRADES } from "@/lib/demo-data";

export default function DemoJournalPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            "name": "Artha Demo Journal - Trade History",
            "description": "View sample trade history in the Artha journal. Every trade is logged with P&L, tags, and notes.",
            "publisher": {
              "@type": "Organization",
              "name": "Artha"
            }
          })
        }}
      />
      <JournalView initialTrades={DEMO_TRADES} isDemo={true} />
    </>
  );
}
