import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { WorkflowStep } from '@/components/ui/workflow-step';

const meta = {
  title: 'Components/WorkflowStep',
  component: WorkflowStep,
} satisfies Meta<typeof WorkflowStep>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Completed: Story = {
  args: {
    step: { stepName: 'Process Payment', status: 'COMPLETED', durationMs: 150 },
    index: 2,
  },
};

export const Failed: Story = {
  args: {
    step: { stepName: 'Check Inventory', status: 'FAILED', error: 'Connection timeout', durationMs: 3200 },
    index: 1,
  },
};

export const Running: Story = {
  args: {
    step: { stepName: 'Create Shipment', status: 'RUNNING' },
    index: 3,
  },
};

export const Pending: Story = {
  args: {
    step: { stepName: 'Send Notification', status: 'PENDING' },
    index: 4,
  },
};

export const Skipped: Story = {
  args: {
    step: { stepName: 'Send Notification', status: 'SKIPPED' },
    index: 4,
  },
};
