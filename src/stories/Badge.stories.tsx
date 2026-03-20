import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Badge } from '@/components/ui/badge';

const meta = {
  title: 'Components/Badge',
  component: Badge,
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'secondary', 'destructive', 'success', 'warning', 'info', 'outline'],
    },
  },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <Badge variant="success">Reviewed</Badge>
      <Badge variant="info">Health Insurance</Badge>
      <Badge variant="warning">ATM Withdrawal</Badge>
      <Badge variant="secondary">Pending</Badge>
      <Badge variant="outline">Other</Badge>
      <Badge variant="destructive">Flagged</Badge>
    </div>
  ),
};

export const Success: Story = { args: { variant: 'success', children: 'Reviewed' } };
export const Info: Story = { args: { variant: 'info', children: 'Health Insurance' } };
export const Warning: Story = { args: { variant: 'warning', children: 'ATM Withdrawal' } };
export const Secondary: Story = { args: { variant: 'secondary', children: 'Pending' } };
export const Outline: Story = { args: { variant: 'outline', children: 'Other' } };
export const Destructive: Story = { args: { variant: 'destructive', children: 'Flagged' } };
