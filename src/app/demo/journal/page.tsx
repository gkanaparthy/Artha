import { JournalView } from "@/components/views/journal-view";
import { DEMO_TRADES } from "@/lib/demo-data";

export default function DemoJournalPage() {
  return <JournalView initialTrades={DEMO_TRADES} isDemo={true} />;
}
