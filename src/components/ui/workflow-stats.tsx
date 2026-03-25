import { Card, CardContent } from "@/components/ui/card";

export type WorkflowStatsProps = {
  total: number;
  completed: number;
  failed: number;
  successRate: number;
  label: string;
};

export function WorkflowStats({ total, completed, failed, successRate, label }: WorkflowStatsProps) {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">{label}</h3>
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{total}</div>
            <div className="text-sm text-gray-500">Total Runs</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{completed}</div>
            <div className="text-sm text-gray-500">Completed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">{failed}</div>
            <div className="text-sm text-gray-500">Failed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{successRate}%</div>
            <div className="text-sm text-gray-500">Success Rate</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
