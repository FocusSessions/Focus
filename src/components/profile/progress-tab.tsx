import { ProgressCharts } from "@/components/profile/progress-charts";
import type { ChartDataPoint } from "@/types/analytics";

interface ProgressTabProps {
  weeklyData: ChartDataPoint[];
  monthlyData: ChartDataPoint[];
  joinedAt?: number;
}

export function ProgressTab({ weeklyData, monthlyData, joinedAt }: ProgressTabProps) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-cozy space-y-6">
      <div>
        <h2 className="font-serif text-lg text-brown mb-4">Focus Trends</h2>
        <ProgressCharts weeklyData={weeklyData} monthlyData={monthlyData} joinedAt={joinedAt} />
      </div>
    </div>
  );
}
