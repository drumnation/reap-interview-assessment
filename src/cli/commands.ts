import { ok, err, type Result } from './result';
import { listCases, getCase } from './commands/cases';
import { listTransactions, getTransaction, updateTransaction, bulkReview, transactionStats } from './commands/transactions';
import { runWorkflow, listWorkflows, getWorkflow, clearWorkflows } from './commands/workflows';

/**
 * Programmatic command dispatcher — used by tests and the Commander CLI.
 * Accepts a flat args array and routes to the appropriate handler.
 */
export async function executeCommand(args: string[]): Promise<Result> {
  const [command, sub, ...rest] = args;

  if (command === 'cases') {
    if (sub === 'list') return listCases();
    if (sub === 'get') return rest[0] ? getCase(rest[0]) : err('Usage: cases get <id>');
    return err(`Unknown cases subcommand: ${sub}`);
  }

  if (command === 'transactions') {
    if (sub === 'list') {
      const caseId = flagValue(args, '--case-id');
      if (!caseId) return err('--case-id is required');
      const limit = parseInt(flagValue(args, '--limit') || '100', 10);
      return listTransactions(caseId, limit);
    }
    if (sub === 'get') return rest[0] ? getTransaction(rest[0]) : err('Usage: transactions get <id>');
    if (sub === 'update') {
      if (!rest[0]) return err('Usage: transactions update <id> [options]');
      return updateTransaction(rest[0], {
        category: flagValue(args, '--category'),
        reviewed: flagValue(args, '--reviewed'),
        flagged: flagValue(args, '--flagged'),
        flagReason: flagValue(args, '--flag-reason'),
        reviewNote: flagValue(args, '--review-note'),
      });
    }
    if (sub === 'bulk-review') {
      const ids = rest.filter((a) => !a.startsWith('--'));
      return ids.length > 0 ? bulkReview(ids) : err('Usage: transactions bulk-review <id1> <id2> ...');
    }
    if (sub === 'stats') {
      const caseId = flagValue(args, '--case-id');
      return caseId ? transactionStats(caseId) : err('--case-id is required');
    }
    return err(`Unknown transactions subcommand: ${sub}`);
  }

  if (command === 'workflow') {
    if (sub === 'run') return runWorkflow();
    if (sub === 'list') return listWorkflows();
    if (sub === 'get') return rest[0] ? getWorkflow(rest[0]) : err('Usage: workflow get <id>');
    if (sub === 'clear') return clearWorkflows();
    return err(`Unknown workflow subcommand: ${sub}`);
  }

  if (command === 'help') {
    return ok({
      commands: {
        'cases list': 'List all cases',
        'cases get <id>': 'Get a case by ID',
        'transactions list --case-id <id>': 'List transactions for a case',
        'transactions get <id>': 'Get a transaction by ID',
        'transactions update <id> [options]': 'Update a transaction',
        'transactions bulk-review <ids...>': 'Mark transactions as reviewed',
        'transactions stats --case-id <id>': 'Get aggregated stats',
        'workflow run': 'Execute order processing workflow',
        'workflow list': 'List all workflow runs',
        'workflow get <id>': 'Get a specific workflow run',
        'workflow clear': 'Clear all workflow runs',
      },
    });
  }

  return err(`Unknown command: ${command}. Run 'help' for available commands.`);
}

function flagValue(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag);
  return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : undefined;
}
