import { Command } from 'commander';
import { WorkflowExecutor, orderWorkflow, type OrderContext } from '@/lib/workflow';
import { workflowStore } from '@/lib/workflow/store';
import { ok, err, type Result } from '../result';

export async function runWorkflow(): Promise<Result> {
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

export function listWorkflows(): Result {
  return ok(workflowStore.getAll());
}

export function getWorkflow(id: string): Result {
  const run = workflowStore.get(id);
  return run ? ok(run) : err(`Workflow run ${id} not found`);
}

export function clearWorkflows(): Result {
  workflowStore.clear();
  return ok({ message: 'All workflow runs cleared' });
}

function output(result: Result) {
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.ok ? 0 : 1;
}

export function registerWorkflowCommand(program: Command) {
  const wf = program.command('workflow').alias('wf').description('Order processing workflows');

  wf
    .command('run')
    .description('Execute a new order processing workflow')
    .action(async () => output(await runWorkflow()));

  wf
    .command('list')
    .description('List all workflow runs')
    .action(() => output(listWorkflows()));

  wf
    .command('get <id>')
    .description('Get a specific workflow run')
    .action((id) => output(getWorkflow(id)));

  wf
    .command('clear')
    .description('Clear all workflow runs')
    .action(() => output(clearWorkflows()));
}
