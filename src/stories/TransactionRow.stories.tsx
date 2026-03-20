import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn, expect, within, userEvent } from '@storybook/test';
import { TransactionRow } from '@/components/ui/transaction-row';

const baseTransaction = {
  id: 'txn-001',
  date: '2024-01-15T00:00:00.000Z',
  description: 'SOCIAL SECURITY ADMIN',
  amountInCents: 185000,
  category: 'SOCIAL_SECURITY',
  isReviewed: false,
  isFlagged: false,
  flagReason: null,
};

const meta = {
  title: 'Components/TransactionRow',
  component: TransactionRow,
  decorators: [
    (Story) => (
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="py-2 px-3 text-left text-xs font-medium text-gray-500">Date</th>
              <th className="py-2 px-3 text-left text-xs font-medium text-gray-500">Description</th>
              <th className="py-2 px-3 text-right text-xs font-medium text-gray-500">Amount</th>
              <th className="py-2 px-3 text-left text-xs font-medium text-gray-500">Category</th>
              <th className="py-2 px-3 text-center text-xs font-medium text-gray-500">Status</th>
              <th className="py-2 px-3 text-center text-xs font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            <Story />
          </tbody>
        </table>
      </div>
    ),
  ],
  args: {
    onToggleReviewed: fn(),
    onCategoryChange: fn(),
  },
} satisfies Meta<typeof TransactionRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    transaction: baseTransaction,
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const reviewButton = canvas.getByRole('button', { name: 'Review' });

    await userEvent.click(reviewButton);

    await expect(args.onToggleReviewed).toHaveBeenCalledWith('txn-001', true);
  },
};

export const Reviewed: Story = {
  args: {
    transaction: { ...baseTransaction, isReviewed: true },
  },
};

export const Flagged: Story = {
  args: {
    transaction: {
      ...baseTransaction,
      isFlagged: true,
      flagReason: 'Unusually large transfer amount',
      description: 'WIRE TRANSFER TO UNKNOWN ACCT',
      amountInCents: -500000,
      category: 'EXTERNAL_TRANSFER',
    },
  },
};

export const FlaggedAndReviewed: Story = {
  args: {
    transaction: {
      ...baseTransaction,
      isReviewed: true,
      isFlagged: true,
      flagReason: 'Reviewed — transfer verified with facility',
      description: 'WIRE TRANSFER TO UNKNOWN ACCT',
      amountInCents: -500000,
      category: 'EXTERNAL_TRANSFER',
    },
  },
};
