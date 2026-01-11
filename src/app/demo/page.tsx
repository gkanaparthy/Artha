import { DashboardView } from "@/components/views/dashboard-view";
import { DEMO_METRICS, DEMO_POSITIONS } from "@/lib/demo-data";

export default function DemoDashboardPage() {
  return (
    <DashboardView
      initialMetrics={DEMO_METRICS}
      initialPositions={DEMO_POSITIONS}
      isDemo={true}
    />
  );
}
