import { prisma } from '@/lib/prisma';
import { WorkflowExecutor, orderWorkflow, type OrderContext } from '@/lib/workflow';
import { workflowStore } from '@/lib/workflow/store';

type Result = { ok: true; data: unknown } | { ok: false; error: string };

function ok(data: unknown): Result {
  return { ok: true, data };
}

function err(error: string): Result {
  return { ok: false, error };
}

function parseFlag(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag);
  return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : undefined;
}

// --- Case commands ---

async function casesCommand(args: string[]): Promise<Result> {
  const sub = args[0];

  if (sub === 'list') {
    const cases = await prisma.case.findMany({
      select: { id: true, residentName: true, facilityName: true, status: true },
      orderBy: { createdAt: 'desc' },
    });
    return ok(cases);
  }

  if (sub === 'get') {
    const id = args[1];
    if (!id) return err('Usage: cases get <id>');
    const c = await prisma.case.findFirst({ where: { id } });
    return c ? ok(c) : err(`Case ${id} not found`);
  }

  return err(`Unknown cases subcommand: ${sub}. Available: list, get`);
}

// --- Transaction commands ---

async function transactionsCommand(args: string[]): Promise<Result> {
  const sub = args[0];

  if (sub === 'list') {
    const caseId = parseFlag(args, '--case-id');
    if (!caseId) return err('--case-id is required. Usage: transactions list --case-id <id>');
    const limit = parseInt(parseFlag(args, '--limit') || '100', 10);

    const txns = await prisma.financialTransaction.findMany({
      where: { caseId },
      orderBy: { date: 'desc' },
      take: limit,
    });
    return ok(txns);
  }

  if (sub === 'get') {
    const id = args[1];
    if (!id) return err('Usage: transactions get <id>');
    const txn = await prisma.financialTransaction.findFirst({ where: { id } });
    return txn ? ok(txn) : err(`Transaction ${id} not found`);
  }

  if (sub === 'update') {
    const id = args[1];
    if (!id) return err('Usage: transactions update <id> [--category X] [--reviewed true/false] [--flagged true/false]');

    const data: Record<string, unknown> = {};
    const category = parseFlag(args, '--category');
    const reviewed = parseFlag(args, '--reviewed');
    const flagged = parseFlag(args, '--flagged');
    const flagReason = parseFlag(args, '--flag-reason');
    const reviewNote = parseFlag(args, '--review-note');

    if (category) data.category = category;
    if (reviewed) data.isReviewed = reviewed === 'true';
    if (flagged) data.isFlagged = flagged === 'true';
    if (flagReason) data.flagReason = flagReason;
    if (reviewNote) data.reviewNote = reviewNote;

    const txn = await prisma.financialTransaction.update({ where: { id }, data });
    return ok(txn);
  }

  if (sub === 'bulk-review') {
    const ids = args.slice(1).filter((a) => !a.startsWith('--'));
    if (ids.length === 0) return err('Usage: transactions bulk-review <id1> <id2> ...');

    const result = await prisma.financialTransaction.updateMany({
      where: { id: { in: ids } },
      data: { isReviewed: true },
    });
    return ok({ count: result.count, ids });
  }

  if (sub === 'stats') {
    const caseId = parseFlag(args, '--case-id');
    if (!caseId) return err('--case-id is required. Usage: transactions stats --case-id <id>');

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
      total,
      reviewed,
      flagged,
      uncategorized,
      income: incomeAgg._sum.amountInCents ?? 0,
      expenses: Math.abs(expenseAgg._sum.amountInCents ?? 0),
      byCategory,
    });
  }

  return err(`Unknown transactions subcommand: ${sub}. Available: list, get, update, bulk-review, stats`);
}

// --- Workflow commands ---

async function workflowCommand(args: string[]): Promise<Result> {
  const sub = args[0];

  if (sub === 'run') {
    const context: OrderContext = {
      orderId: `ORD-${Date.now()}`,
      customerId: `CUST-${crypto.randomUUID().substring(0, 8)}`,
      items: [
        { productId: 'PROD-001', quantity: 2, price: 29.99 },
        { productId: 'PROD-002', quantity: 1, price: 49.99 },
      ],
      totalAmount: 109.97,
    };

    const executor = new WorkflowExecutor<OrderContext>(orderWorkflow.name, context);
    const run = await executor.execute(orderWorkflow);
    workflowStore.save(run);
    return ok(run);
  }

  if (sub === 'list') {
    return ok(workflowStore.getAll());
  }

  if (sub === 'get') {
    const id = args[1];
    if (!id) return err('Usage: workflow get <id>');
    const run = workflowStore.get(id);
    return run ? ok(run) : err(`Workflow run ${id} not found`);
  }

  if (sub === 'clear') {
    workflowStore.clear();
    return ok({ message: 'All workflow runs cleared' });
  }

  return err(`Unknown workflow subcommand: ${sub}. Available: run, list, get, clear`);
}

// --- Main dispatcher ---

const COMMANDS: Record<string, string> = {
  'cases list': 'List all cases',
  'cases get <id>': 'Get a case by ID',
  'transactions list --case-id <id>': 'List transactions for a case',
  'transactions get <id>': 'Get a transaction by ID',
  'transactions update <id> [--category X] [--reviewed true/false]': 'Update a transaction',
  'transactions bulk-review <id1> <id2> ...': 'Mark transactions as reviewed',
  'transactions stats --case-id <id>': 'Get aggregated stats for a case',
  'workflow run': 'Execute a new order processing workflow',
  'workflow list': 'List all workflow runs',
  'workflow get <id>': 'Get a specific workflow run',
  'workflow clear': 'Clear all workflow runs',
};

export async function executeCommand(args: string[]): Promise<Result> {
  const command = args[0];

  if (command === 'cases') return casesCommand(args.slice(1));
  if (command === 'transactions') return transactionsCommand(args.slice(1));
  if (command === 'workflow') return workflowCommand(args.slice(1));
  if (command === 'help') return ok({ commands: COMMANDS });

  return err(`Unknown command: ${command}. Run 'help' for available commands.`);
}
