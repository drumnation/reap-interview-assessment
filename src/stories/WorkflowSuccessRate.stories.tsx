import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { WorkflowStats } from '@/components/ui/workflow-stats';

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
