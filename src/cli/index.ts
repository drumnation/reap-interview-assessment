#!/usr/bin/env tsx
import { Command } from 'commander';
import { registerCasesCommand } from './commands/cases';
import { registerTransactionsCommand } from './commands/transactions';
import { registerWorkflowCommand } from './commands/workflows';

const program = new Command()
  .name('reap')
  .description('REAP Medicaid case management CLI')
  .version('1.0.0');

registerCasesCommand(program);
registerTransactionsCommand(program);
registerWorkflowCommand(program);

program.parseAsync(process.argv).catch((err) => {
  console.error(JSON.stringify({ ok: false, error: err.message }));
  process.exit(1);
});
