import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock Prisma before importing routes
vi.mock('@/lib/prisma', () => ({
  prisma: {
    financialTransaction: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

import { prisma } from '@/lib/prisma';
import { PATCH as bulkPatch } from '@/app/api/transactions/bulk/route';
import { GET as getTransactions } from '@/app/api/transactions/route';

const mockUpdateMany = prisma.financialTransaction.updateMany as ReturnType<typeof vi.fn>;
const mockFindMany = prisma.financialTransaction.findMany as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

// --- Helpers ---

function makeBulkRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/transactions/bulk', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makeGetRequest(params: Record<string, string>): NextRequest {
  const url = new URL('http://localhost/api/transactions');
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return new NextRequest(url);
}

function makeFakeTransaction(id: string) {
  return {
    id,
    date: new Date(),
    description: `Txn ${id}`,
    amountInCents: 1000,
    category: 'UNCATEGORIZED',
    isReviewed: false,
    isFlagged: false,
    caseId: 'case-1',
  };
}

// --- PATCH /api/transactions/bulk ---

describe('PATCH /api/transactions/bulk', () => {
  it('calls updateMany exactly once with correct args', async () => {
    mockUpdateMany.mockResolvedValue({ count: 3 });

    const ids = ['id-1', 'id-2', 'id-3'];
    const updates = { isReviewed: true };
    const res = await bulkPatch(makeBulkRequest({ ids, updates }));
    const json = await res.json();

    expect(mockUpdateMany).toHaveBeenCalledTimes(1);
    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { id: { in: ids } },
      data: updates,
    });
    expect(json.count).toBe(3);
    expect(res.status).toBe(200);
  });

  it('returns 400 when ids array is empty', async () => {
    const res = await bulkPatch(makeBulkRequest({ ids: [], updates: { isReviewed: true } }));

    expect(res.status).toBe(400);
    expect(mockUpdateMany).not.toHaveBeenCalled();
  });

  it('returns 400 when body is missing the updates field', async () => {
    const res = await bulkPatch(makeBulkRequest({ ids: ['id-1'] }));

    expect(res.status).toBe(400);
    expect(mockUpdateMany).not.toHaveBeenCalled();
  });

  it('calls updateMany with empty data when updates has no fields set', async () => {
    // Zod schema makes all update fields optional, so {} passes validation.
    // This is a design choice — updateMany with empty data is a no-op.
    mockUpdateMany.mockResolvedValue({ count: 0 });

    const res = await bulkPatch(makeBulkRequest({ ids: ['id-1'], updates: {} }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { id: { in: ['id-1'] } },
      data: {},
    });
  });
});

// --- GET /api/transactions ---

describe('GET /api/transactions', () => {
  it('returns hasMore:true and non-null nextCursor when findMany returns limit+1 rows', async () => {
    // Default limit is 100, so route does take: 101. Return 101 rows.
    const rows = Array.from({ length: 101 }, (_, i) => makeFakeTransaction(`txn-${i}`));
    mockFindMany.mockResolvedValue(rows);

    const res = await getTransactions(makeGetRequest({ caseId: 'case-1' }));
    const json = await res.json();

    expect(json.hasMore).toBe(true);
    expect(json.nextCursor).toBe('txn-99'); // last item of the 100 returned
    expect(json.data).toHaveLength(100);
  });

  it('returns hasMore:false and nextCursor:null when findMany returns fewer than limit rows', async () => {
    const rows = Array.from({ length: 50 }, (_, i) => makeFakeTransaction(`txn-${i}`));
    mockFindMany.mockResolvedValue(rows);

    const res = await getTransactions(makeGetRequest({ caseId: 'case-1' }));
    const json = await res.json();

    expect(json.hasMore).toBe(false);
    expect(json.nextCursor).toBeNull();
    expect(json.data).toHaveLength(50);
  });

  it('passes cursor, skip:1, and where clause to findMany when cursor param is provided', async () => {
    mockFindMany.mockResolvedValue([]);

    await getTransactions(makeGetRequest({ caseId: 'case-1', cursor: 'cursor-abc' }));

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { caseId: 'case-1' },
        skip: 1,
        cursor: { id: 'cursor-abc' },
      })
    );
  });

  it('returns 400 when caseId query param is missing', async () => {
    const res = await getTransactions(new NextRequest('http://localhost/api/transactions'));
    expect(res.status).toBe(400);
  });

  it('caps take at 501 even when caller passes limit=9999', async () => {
    mockFindMany.mockResolvedValue([]);

    await getTransactions(makeGetRequest({ caseId: 'case-1', limit: '9999' }));

    // Math.min(9999, 500) = 500, then take = 500 + 1 = 501
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 501,
      })
    );
  });
});
