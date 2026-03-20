import { Command } from 'commander';
import { prisma } from '@/lib/prisma';
import { ok, err, type Result } from '../result';

export async function listTransactions(caseId: string, limit: number = 100): Promise<Result> {
  const txns = await prisma.financialTransaction.findMany({
    where: { caseId },
    orderBy: { date: 'desc' },
    take: limit,
  });
  return ok(txns);
}

export async function getTransaction(id: string): Promise<Result> {
  const txn = await prisma.financialTransaction.findFirst({ where: { id } });
  return txn ? ok(txn) : err(`Transaction ${id} not found`);
}

export async function updateTransaction(
  id: string,
  opts: { category?: string; reviewed?: string; flagged?: string; flagReason?: string; reviewNote?: string }
): Promise<Result> {
  const data: Record<string, unknown> = {};
  if (opts.category) data.category = opts.category;
  if (opts.reviewed) data.isReviewed = opts.reviewed === 'true';
  if (opts.flagged) data.isFlagged = opts.flagged === 'true';
  if (opts.flagReason) data.flagReason = opts.flagReason;
  if (opts.reviewNote) data.reviewNote = opts.reviewNote;

  const txn = await prisma.financialTransaction.update({ where: { id }, data });
  return ok(txn);
}

export async function bulkReview(ids: string[]): Promise<Result> {
  const result = await prisma.financialTransaction.updateMany({
    where: { id: { in: ids } },
    data: { isReviewed: true },
  });
  return ok({ count: result.count, ids });
}

export async function transactionStats(caseId: string): Promise<Result> {
  const where = { caseId };
  const [total, reviewed, flagged, uncategorized, incomeAgg, expenseAgg, categoryGroups] =
    await Promise.all([
      prisma.financialTransaction.count({ where }),
      prisma.financialTransaction.count({ where: { ...where, isReviewed: true } }),
      prisma.financialTransaction.count({ where: { ...where, isFlagged: true } }),
      prisma.financialTransaction.count({ where: { ...where, category: 'UNCATEGORIZED' } }),
      prisma.financialTransaction.aggregate({
        where: { ...where, amountInCents: { gt: 0 } },
        _sum: { amountInCents: true },
      }),
      prisma.financialTransaction.aggregate({
        where: { ...where, amountInCents: { lt: 0 } },
        _sum: { amountInCents: true },
      }),
      prisma.financialTransaction.groupBy({
        by: ['category'],
        where,
        _count: true,
        _sum: { amountInCents: true },
      }),
    ]);

  const byCategory = Object.fromEntries(
    categoryGroups.map((g: { category: string; _count: number; _sum: { amountInCents: number | null } }) => [
      g.category,
      { count: g._count, total: g._sum.amountInCents ?? 0 },
    ])
  );

  return ok({
    total, reviewed, flagged, uncategorized,
    income: incomeAgg._sum.amountInCents ?? 0,
    expenses: Math.abs(expenseAgg._sum.amountInCents ?? 0),
    byCategory,
  });
}

function output(result: Result) {
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.ok ? 0 : 1;
}

export function registerTransactionsCommand(program: Command) {
  const txn = program.command('transactions').alias('txn').description('Manage financial transactions');

  txn
    .command('list')
    .description('List transactions for a case')
    .requiredOption('--case-id <id>', 'Case ID')
    .option('--limit <n>', 'Max results', '100')
    .action(async (opts) => output(await listTransactions(opts.caseId, parseInt(opts.limit, 10))));

  txn
    .command('get <id>')
    .description('Get a transaction by ID')
    .action(async (id) => output(await getTransaction(id)));

  txn
    .command('update <id>')
    .description('Update a transaction')
    .option('--category <value>', 'Set category')
    .option('--reviewed <bool>', 'Set reviewed status')
    .option('--flagged <bool>', 'Set flagged status')
    .option('--flag-reason <text>', 'Set flag reason')
    .option('--review-note <text>', 'Set review note')
    .action(async (id, opts) => output(await updateTransaction(id, opts)));

  txn
    .command('bulk-review <ids...>')
    .description('Mark multiple transactions as reviewed')
    .action(async (ids) => output(await bulkReview(ids)));

  txn
    .command('stats')
    .description('Get aggregated stats for a case')
    .requiredOption('--case-id <id>', 'Case ID')
    .action(async (opts) => output(await transactionStats(opts.caseId)));
}
