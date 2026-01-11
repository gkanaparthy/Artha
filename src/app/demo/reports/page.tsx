import { ReportsView } from "@/components/views/reports-view";
import { DEMO_METRICS } from "@/lib/demo-data";

export default function DemoReportsPage() {
  return <ReportsView initialMetrics={DEMO_METRICS} isDemo={true} />;
}
