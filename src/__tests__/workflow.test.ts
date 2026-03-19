import { describe, it, expect } from 'vitest';
import { processPaymentStep, type OrderContext } from '@/lib/workflow/steps/order-steps';
import { WorkflowExecutor } from '@/lib/workflow/executor';
import { orderWorkflow } from '@/lib/workflow/workflows/order-workflow';

function makeOrderContext(overrides?: Partial<OrderContext>): OrderContext {
  return {
    orderId: 'ORD-001',
    customerId: 'CUST-001',
    items: [{ productId: 'PROD-1', quantity: 1, price: 29.99 }],
    totalAmount: 29.99,
    ...overrides,
  };
}

describe('processPaymentStep', () => {
  it('should return success:true when the payment gateway succeeds', async () => {
    const context = makeOrderContext();
    const result = await processPaymentStep(context);

    // The payment gateway always returns success:true.
    // This test FAILS against the buggy code because the if/else is inverted.
    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('paymentId');
    expect(result.data).toHaveProperty('paymentStatus', 'completed');
  });
});

describe('WorkflowExecutor.execute()', () => {
  it('should complete successfully when all steps succeed', async () => {
    const context = makeOrderContext();
    const executor = new WorkflowExecutor('Order Processing', context);
    const run = await executor.execute(orderWorkflow);

    expect(run.status).toBe('COMPLETED');
    expect(run.error).toBeUndefined();
  }, 15000);

  it('should retry retryable steps on transient failure', async () => {
    // Run the workflow multiple times. With retries (up to 3 per step),
    // the combined probability of inventory (~40% fail) and notification
    // (~25% fail) both succeeding within retries is very high (~97%).
    let successes = 0;
    const totalRuns = 20;

    for (let i = 0; i < totalRuns; i++) {
      const context = makeOrderContext();
      const executor = new WorkflowExecutor('Order Processing', context);
      const run = await executor.execute(orderWorkflow);
      if (run.status === 'COMPLETED') successes++;
    }

    const successRate = successes / totalRuns;
    // Without retries: ~45% success. With retries: ~97%.
    expect(successRate).toBeGreaterThan(0.8);
  }, 60000);
});

describe('Workflow reliability (stress test)', () => {
  it('should succeed >85% of the time across 20 runs', async () => {
    let successes = 0;
    const totalRuns = 20;

    for (let i = 0; i < totalRuns; i++) {
      const context = makeOrderContext();
      const executor = new WorkflowExecutor('Order Processing', context);
      const run = await executor.execute(orderWorkflow);
      if (run.status === 'COMPLETED') successes++;
    }

    const successRate = successes / totalRuns;
    // With retries (up to 3), expected ~97%. Threshold at 85% accounts
    // for statistical variance in small sample. Without retries: ~0%
    // (payment bug) or ~45% (retry bug only).
    expect(successRate).toBeGreaterThan(0.85);
  }, 60000);
});
