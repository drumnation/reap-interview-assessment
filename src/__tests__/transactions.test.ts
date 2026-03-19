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
    it('should use setTransactions for optimistic updates in single-item handlers', () => {
      // The buggy code calls fetchTransactions() in the happy path after every action.
      // The fix should use setTransactions() for optimistic updates (fetchTransactions
      // in catch blocks is fine as an error fallback).

      // Extract the try blocks of each handler (before the catch)
      const categoryTryMatch = TRANSACTIONS_PAGE.match(
        /const handleCategoryChange[\s\S]*?try\s*\{([\s\S]*?)\}\s*catch/
      );
      const toggleTryMatch = TRANSACTIONS_PAGE.match(
        /const handleToggleReviewed[\s\S]*?try\s*\{([\s\S]*?)\}\s*catch/
      );

      // The try block should NOT call fetchTransactions (optimistic instead)
      if (categoryTryMatch) {
        expect(categoryTryMatch[1]).not.toContain('fetchTransactions');
      }
      if (toggleTryMatch) {
        expect(toggleTryMatch[1]).not.toContain('fetchTransactions');
      }

      // Both handlers should use setTransactions for optimistic updates
      expect(TRANSACTIONS_PAGE).toMatch(/handleCategoryChange[\s\S]*?setTransactions/);
      expect(TRANSACTIONS_PAGE).toMatch(/handleToggleReviewed[\s\S]*?setTransactions/);
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
