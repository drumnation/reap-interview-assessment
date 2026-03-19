import { describe, it, expect } from 'vitest';
import { processPaymentStep, checkInventoryStep, sendNotificationStep, type OrderContext } from '@/lib/workflow/steps/order-steps';
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

describe('checkInventoryStep', () => {
  it('should eventually succeed despite transient failures (retry logic)', async () => {
    // Run the step 20 times — with retry logic, nearly all should succeed.
    // Without retries, ~40% will fail on every attempt.
    const context = makeOrderContext();
    let successes = 0;

    for (let i = 0; i < 20; i++) {
      const result = await checkInventoryStep(context);
      if (result.success) successes++;
    }

    // With 3 retries, expected failure rate drops from 40% to ~6.4%.
    // 20 runs * 93.6% expected success = ~18.7 successes.
    // Without retries, expected ~12 successes.
    // We require at least 17/20 to confirm retry logic is working.
    expect(successes).toBeGreaterThanOrEqual(17);
  });
});

describe('sendNotificationStep', () => {
  it('should eventually succeed despite transient failures (retry logic)', async () => {
    const context = makeOrderContext({
      paymentId: 'PAY-001',
      shipmentId: 'SHIP-001',
    });
    let successes = 0;

    for (let i = 0; i < 20; i++) {
      const result = await sendNotificationStep(context);
      if (result.success) successes++;
    }

    // With 3 retries, failure rate drops from 25% to ~1.6%.
    // Without retries, expected ~15 successes.
    // We require at least 18/20.
    expect(successes).toBeGreaterThanOrEqual(18);
  });
});

describe('WorkflowExecutor.execute()', () => {
  it('should complete successfully when all steps succeed', async () => {
    // Run the full workflow. With the payment bug fixed and retries added,
    // this should complete. Against buggy code, payment always fails.
    const context = makeOrderContext();
    const executor = new WorkflowExecutor('Order Processing', context);
    const run = await executor.execute(orderWorkflow);

    expect(run.status).toBe('COMPLETED');
    expect(run.error).toBeUndefined();
  });
});

describe('Workflow reliability (stress test)', () => {
  it('should succeed >90% of the time across 50 runs', async () => {
    let successes = 0;
    const totalRuns = 50;

    for (let i = 0; i < totalRuns; i++) {
      const context = makeOrderContext();
      const executor = new WorkflowExecutor('Order Processing', context);
      const run = await executor.execute(orderWorkflow);
      if (run.status === 'COMPLETED') successes++;
    }

    const successRate = successes / totalRuns;
    // With retries, expected >95%. Without, ~0% (payment bug) or ~45% (only retry bug).
    expect(successRate).toBeGreaterThan(0.9);
  }, 30000); // longer timeout for 50 runs
});
