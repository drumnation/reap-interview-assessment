import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Challenge 1: Transaction Review — API Route Tests
 *
 * Tests the actual request/response behavior of the API routes by importing
 * the handlers directly and calling them with real Request objects.
 * Prisma is mocked so no DB is needed.
 */

// --- Prisma mock -----------------------------------------------------------
const mockUpdateMany = vi.fn();
const mockFindMany = vi.fn();

vi.mock('@/lib/prisma', () => ({
  prisma: {
    financialTransaction: {
      updateMany: mockUpdateMany,
      findMany: mockFindMany,
    },
  },
}));

// ---------------------------------------------------------------------------

describe('Challenge 1: Transaction Review', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  describe('PATCH /api/transactions/bulk', () => {
    it('uses updateMany — one DB call regardless of ID count', async () => {
      const { PATCH } = await import('@/app/api/transactions/bulk/route');

      mockUpdateMany.mockResolvedValue({ count: 3 });

      const ids = ['id-1', 'id-2', 'id-3'];
      const req = new Request('http://localhost/api/transactions/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, updates: { isReviewed: true } }),
      });

      const res = await PATCH(req as any);
      const body = await res.json();

      // One call, not N
      expect(mockUpdateMany).toHaveBeenCalledTimes(1);
      expect(mockUpdateMany).toHaveBeenCalledWith({
        where: { id: { in: ids } },
        data: { isReviewed: true },
      });
      expect(body.count).toBe(3);
      expect(res.status).toBe(200);
    });

    it('returns 400 when ids array is empty', async () => {
      const { PATCH } = await import('@/app/api/transactions/bulk/route');

      const req = new Request('http://localhost/api/transactions/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [], updates: { isReviewed: true } }),
      });

      const res = await PATCH(req as any);
      expect(res.status).toBe(400);
    });

    it('returns 400 when body is missing required fields', async () => {
      const { PATCH } = await import('@/app/api/transactions/bulk/route');

      const req = new Request('http://localhost/api/transactions/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: ['x'] }), // missing `updates`
      });

      const res = await PATCH(req as any);
      expect(res.status).toBe(400);
    });
  });

  // -------------------------------------------------------------------------
  describe('GET /api/transactions — cursor pagination', () => {
    const makeFakeTransactions = (count: number) =>
      Array.from({ length: count }, (_, i) => ({
        id: `tx-${i}`,
        caseId: 'case-1',
        date: new Date().toISOString(),
        description: `Transaction ${i}`,
        amountInCents: 100,
        category: 'UNCATEGORIZED',
        isReviewed: false,
        isFlagged: false,
        flagReason: null,
        reviewNote: null,
        accountLastFour: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));

    it('returns hasMore:true and nextCursor when more records exist', async () => {
      // Route requests limit+1; returning limit+1 rows signals more pages
      mockFindMany.mockResolvedValue(makeFakeTransactions(101)); // 100 limit + 1 overflow

      const { GET } = await import('@/app/api/transactions/route');

      const req = new Request(
        'http://localhost/api/transactions?caseId=case-1&limit=100',
      );
      const res = await GET(req as any);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.hasMore).toBe(true);
      expect(body.nextCursor).not.toBeNull();
      expect(body.data).toHaveLength(100); // overflow row stripped
    });

    it('returns hasMore:false and nextCursor:null on last page', async () => {
      mockFindMany.mockResolvedValue(makeFakeTransactions(50));

      const { GET } = await import('@/app/api/transactions/route');

      const req = new Request(
        'http://localhost/api/transactions?caseId=case-1&limit=100',
      );
      const res = await GET(req as any);
      const body = await res.json();

      expect(body.hasMore).toBe(false);
      expect(body.nextCursor).toBeNull();
      expect(body.data).toHaveLength(50);
    });

    it('passes cursor to findMany when provided', async () => {
      mockFindMany.mockResolvedValue(makeFakeTransactions(10));

      const { GET } = await import('@/app/api/transactions/route');

      const req = new Request(
        'http://localhost/api/transactions?caseId=case-1&cursor=tx-99',
      );
      await GET(req as any);

      const call = mockFindMany.mock.calls[0][0];
      expect(call.cursor).toEqual({ id: 'tx-99' });
      expect(call.skip).toBe(1);
    });

    it('returns 400 when caseId is missing', async () => {
      const { GET } = await import('@/app/api/transactions/route');

      const req = new Request('http://localhost/api/transactions');
      const res = await GET(req as any);
      expect(res.status).toBe(400);
    });

    it('caps limit at 500 regardless of what the caller requests', async () => {
      mockFindMany.mockResolvedValue([]);

      const { GET } = await import('@/app/api/transactions/route');

      const req = new Request(
        'http://localhost/api/transactions?caseId=case-1&limit=9999',
      );
      await GET(req as any);

      const call = mockFindMany.mock.calls[0][0];
      expect(call.take).toBeLessThanOrEqual(501); // 500 + 1 overflow probe
    });
  });
});
