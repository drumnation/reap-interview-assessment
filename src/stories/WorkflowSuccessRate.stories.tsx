import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Card, CardContent } from '@/components/ui/card';

type WorkflowStatsProps = {
  total: number;
  completed: number;
  failed: number;
  successRate: number;
  label: string;
};

function WorkflowStats({ total, completed, failed, successRate, label }: WorkflowStatsProps) {
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

const meta = {
  title: 'Components/WorkflowSuccessRate',
  component: WorkflowStats,
} satisfies Meta<typeof WorkflowStats>;

export default meta;
type Story = StoryObj<typeof meta>;

export const BeforeFixes: Story = {
  args: {
    label: 'Before Fixes — Payment step inverted, no retries',
    total: 10,
    completed: 0,
    failed: 10,
    successRate: 0,
  },
};

export const AfterFixes: Story = {
  args: {
    label: 'After Fixes — Payment corrected, retry with backoff',
    total: 10,
    completed: 9,
    failed: 1,
    successRate: 90,
  },
};

export const Comparison: Story = {
  render: () => (
    <div className="space-y-8">
      <WorkflowStats
        label="Before Fixes — Payment step inverted, no retries"
        total={10} completed={0} failed={10} successRate={0}
      />
      <div className="border-t pt-4">
        <WorkflowStats
          label="After Fixes — Payment corrected, retry with backoff"
          total={10} completed={9} failed={1} successRate={90}
        />
      </div>
    </div>
  ),
};
