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
      <table className="w-full">
        <tbody>
          <Story />
        </tbody>
      </table>
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
