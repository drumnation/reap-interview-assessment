import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * These tests verify the code structure to confirm bugs are fixed.
 * They read source files and assert correctness of implementation patterns.
 * This avoids needing a full Next.js server or DOM environment.
 */

const TRANSACTIONS_PAGE = readFileSync(
  resolve(__dirname, '../app/transactions/page.tsx'),
  'utf-8'
);

const BULK_ROUTE = readFileSync(
  resolve(__dirname, '../app/api/transactions/bulk/route.ts'),
  'utf-8'
);

const TRANSACTIONS_ROUTE = readFileSync(
  resolve(__dirname, '../app/api/transactions/route.ts'),
  'utf-8'
);

describe('Challenge 1: Transaction Review', () => {
  describe('Bulk mark reviewed', () => {
    it('should call /api/transactions/bulk, not individual endpoints', () => {
      // The buggy code maps over selectedIds and calls /api/transactions/${id}
      // The fix should call /api/transactions/bulk with all IDs in one request.
      const hasBulkEndpointCall = TRANSACTIONS_PAGE.includes('/api/transactions/bulk');
      const hasIndividualLoopPattern = /selectedIds\)\.map\(.*fetch\(`\/api\/transactions\/\$\{id\}`/.test(TRANSACTIONS_PAGE);

      expect(hasBulkEndpointCall).toBe(true);
      expect(hasIndividualLoopPattern).toBe(false);
    });
  });

  describe('Bulk API endpoint', () => {
    it('should use updateMany instead of sequential individual updates', () => {
      // The buggy code loops: for (const id of ids) { prisma.financialTransaction.update(...) }
      // The fix should use: prisma.financialTransaction.updateMany(...)
      const hasUpdateMany = BULK_ROUTE.includes('updateMany');
      const hasForLoop = /for\s*\(\s*const\s+id\s+of\s+ids\s*\)/.test(BULK_ROUTE);

      expect(hasUpdateMany).toBe(true);
      expect(hasForLoop).toBe(false);
    });
  });

  describe('Optimistic UI updates', () => {
    it('should not refetch all transactions after single-item updates', () => {
      // The buggy code calls fetchTransactions() after every toggle/category change.
      // Count occurrences of fetchTransactions() calls — there should be fewer after fix.
      // Specifically, handleCategoryChange and handleToggleReviewed should NOT call fetchTransactions.

      // Extract the handler functions
      const categoryHandlerMatch = TRANSACTIONS_PAGE.match(
        /const handleCategoryChange[\s\S]*?(?=\n\s*const handle|\n\s*const getCategoryBadge)/
      );
      const toggleHandlerMatch = TRANSACTIONS_PAGE.match(
        /const handleToggleReviewed[\s\S]*?(?=\n\s*const handle|\n\s*const getCategoryBadge)/
      );

      // These handlers should use optimistic state updates, not fetchTransactions
      if (categoryHandlerMatch) {
        expect(categoryHandlerMatch[0]).not.toMatch(/await\s+fetchTransactions\(\)/);
      }
      if (toggleHandlerMatch) {
        expect(toggleHandlerMatch[0]).not.toMatch(/await\s+fetchTransactions\(\)/);
      }
    });
  });

  describe('Pagination', () => {
    it('should support limit/cursor query params in GET /api/transactions', () => {
      // The buggy code has no pagination — returns all rows.
      // The fix should include take/skip or cursor-based pagination.
      const hasTake = TRANSACTIONS_ROUTE.includes('take');
      const hasLimit = TRANSACTIONS_ROUTE.includes('limit');
      const hasPagination = hasTake || hasLimit;

      expect(hasPagination).toBe(true);
    });
  });
});
