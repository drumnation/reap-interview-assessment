import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    case: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    financialTransaction: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
      groupBy: vi.fn(),
    },
  },
}));

import { prisma } from '@/lib/prisma';
import { executeCommand } from '@/cli/commands';

const mockCaseFindMany = prisma.case.findMany as ReturnType<typeof vi.fn>;
const mockCaseFindFirst = prisma.case.findFirst as ReturnType<typeof vi.fn>;
const mockTxnFindMany = prisma.financialTransaction.findMany as ReturnType<typeof vi.fn>;
const mockTxnFindFirst = prisma.financialTransaction.findFirst as ReturnType<typeof vi.fn>;
const mockTxnUpdate = prisma.financialTransaction.update as ReturnType<typeof vi.fn>;
const mockTxnUpdateMany = prisma.financialTransaction.updateMany as ReturnType<typeof vi.fn>;
const mockTxnCount = prisma.financialTransaction.count as ReturnType<typeof vi.fn>;
const mockTxnAggregate = prisma.financialTransaction.aggregate as ReturnType<typeof vi.fn>;
const mockTxnGroupBy = prisma.financialTransaction.groupBy as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

// --- cases ---

describe('cases list', () => {
  it('returns all cases', async () => {
    const cases = [{ id: 'c1', residentName: 'John', facilityName: 'Sunny', status: 'DRAFT' }];
    mockCaseFindMany.mockResolvedValue(cases);

    const result = await executeCommand(['cases', 'list']);

    expect(result.ok).toBe(true);
    expect(result.data).toEqual(cases);
    expect(mockCaseFindMany).toHaveBeenCalledTimes(1);
  });
});

describe('cases get', () => {
  it('returns a single case by id', async () => {
    const c = { id: 'c1', residentName: 'John', facilityName: 'Sunny', status: 'DRAFT' };
    mockCaseFindFirst.mockResolvedValue(c);

    const result = await executeCommand(['cases', 'get', 'c1']);

    expect(result.ok).toBe(true);
    expect(result.data).toEqual(c);
  });

  it('returns error when case not found', async () => {
    mockCaseFindFirst.mockResolvedValue(null);

    const result = await executeCommand(['cases', 'get', 'missing']);

    expect(result.ok).toBe(false);
    expect(result.error).toContain('not found');
  });
});

// --- transactions ---

describe('transactions list', () => {
  it('returns transactions for a case', async () => {
    const txns = [{ id: 't1', description: 'SSI', amountInCents: 1000 }];
    mockTxnFindMany.mockResolvedValue(txns);

    const result = await executeCommand(['transactions', 'list', '--case-id', 'c1']);

    expect(result.ok).toBe(true);
    expect(result.data).toEqual(txns);
    expect(mockTxnFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { caseId: 'c1' } })
    );
  });

  it('returns error when case-id missing', async () => {
    const result = await executeCommand(['transactions', 'list']);

    expect(result.ok).toBe(false);
    expect(result.error).toContain('case-id');
  });
});

describe('transactions get', () => {
  it('returns a single transaction', async () => {
    const txn = { id: 't1', description: 'SSI', amountInCents: 1000 };
    mockTxnFindFirst.mockResolvedValue(txn);

    const result = await executeCommand(['transactions', 'get', 't1']);

    expect(result.ok).toBe(true);
    expect(result.data).toEqual(txn);
  });
});

describe('transactions update', () => {
  it('updates a transaction with provided fields', async () => {
    const updated = { id: 't1', category: 'MEDICAL', isReviewed: true };
    mockTxnUpdate.mockResolvedValue(updated);

    const result = await executeCommand([
      'transactions', 'update', 't1',
      '--category', 'MEDICAL',
      '--reviewed', 'true',
    ]);

    expect(result.ok).toBe(true);
    expect(mockTxnUpdate).toHaveBeenCalledWith({
      where: { id: 't1' },
      data: expect.objectContaining({ category: 'MEDICAL', isReviewed: true }),
    });
  });
});

describe('transactions bulk-review', () => {
  it('marks multiple transactions as reviewed', async () => {
    mockTxnUpdateMany.mockResolvedValue({ count: 3 });

    const result = await executeCommand([
      'transactions', 'bulk-review', 't1', 't2', 't3',
    ]);

    expect(result.ok).toBe(true);
    expect(result.data.count).toBe(3);
    expect(mockTxnUpdateMany).toHaveBeenCalledWith({
      where: { id: { in: ['t1', 't2', 't3'] } },
      data: { isReviewed: true },
    });
  });
});

describe('transactions stats', () => {
  it('returns aggregated stats for a case', async () => {
    mockTxnCount.mockResolvedValue(100);
    mockTxnAggregate.mockResolvedValue({ _sum: { amountInCents: 50000 } });
    mockTxnGroupBy.mockResolvedValue([
      { category: 'MEDICAL', _count: 10, _sum: { amountInCents: -5000 } },
    ]);

    const result = await executeCommand(['transactions', 'stats', '--case-id', 'c1']);

    expect(result.ok).toBe(true);
    expect(result.data).toHaveProperty('total');
  });
});

// --- workflows ---

describe('workflow run', () => {
  it('executes a workflow and returns the result', async () => {
    const result = await executeCommand(['workflow', 'run']);

    expect(result.ok).toBe(true);
    expect(result.data).toHaveProperty('status');
    expect(result.data).toHaveProperty('steps');
  }, 15000);
});

describe('workflow list', () => {
  it('returns all workflow runs', async () => {
    // Run one first to populate the store
    await executeCommand(['workflow', 'run']);
    const result = await executeCommand(['workflow', 'list']);

    expect(result.ok).toBe(true);
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.data.length).toBeGreaterThanOrEqual(1);
  }, 15000);
});

describe('workflow clear', () => {
  it('clears all workflow runs', async () => {
    await executeCommand(['workflow', 'run']);
    const result = await executeCommand(['workflow', 'clear']);

    expect(result.ok).toBe(true);

    const listResult = await executeCommand(['workflow', 'list']);
    expect(listResult.data.length).toBe(0);
  }, 15000);
});

// --- help / unknown ---

describe('help', () => {
  it('returns usage info for unknown commands', async () => {
    const result = await executeCommand(['help']);

    expect(result.ok).toBe(true);
    expect(result.data).toHaveProperty('commands');
  });

  it('returns error for completely unknown commands', async () => {
    const result = await executeCommand(['foobar']);

    expect(result.ok).toBe(false);
    expect(result.error).toContain('Unknown');
  });
});
