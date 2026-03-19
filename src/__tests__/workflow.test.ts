import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  processPaymentStep,
  validateOrderStep,
  checkInventoryStep,
  sendNotificationStep,
  createShipmentStep,
  type OrderContext,
} from '@/lib/workflow/steps/order-steps';
import { WorkflowExecutor } from '@/lib/workflow/executor';
import { orderWorkflow } from '@/lib/workflow/workflows/order-workflow';

/**
 * Challenge 2: Order Processing Workflow
 *
 * Unit tests use vi.spyOn to mock the private simulator functions
 * by controlling Math.random — giving us deterministic results
 * without modifying production code.
 */

function makeOrderContext(overrides?: Partial<OrderContext>): OrderContext {
  return {
    orderId: 'ORD-001',
    customerId: 'CUST-001',
    items: [{ productId: 'PROD-1', quantity: 1, price: 29.99 }],
    totalAmount: 29.99,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Helpers for controlling Math.random deterministically
// ---------------------------------------------------------------------------

/** Force Math.random to always return a value that bypasses random failures. */
const mockRandomSuccess = () => vi.spyOn(Math, 'random').mockReturnValue(0.99);

/** Force Math.random to always return a value that triggers random failures. */
const mockRandomFailure = () => vi.spyOn(Math, 'random').mockReturnValue(0.01);

// ---------------------------------------------------------------------------

describe('validateOrderStep', () => {
  it('succeeds with a valid order', async () => {
    const result = await validateOrderStep(makeOrderContext());
    expect(result.success).toBe(true);
  });

  it('fails when orderId is empty', async () => {
    const result = await validateOrderStep(makeOrderContext({ orderId: '' }));
    expect(result.success).toBe(false);
    expect(result.error).toContain('Order ID');
  });

  it('fails when customerId is missing', async () => {
    const result = await validateOrderStep(makeOrderContext({ customerId: '' }));
    expect(result.success).toBe(false);
    expect(result.error).toContain('Customer ID');
  });

  it('fails when items array is empty', async () => {
    const result = await validateOrderStep(makeOrderContext({ items: [] }));
    expect(result.success).toBe(false);
    expect(result.error).toContain('at least one item');
  });

  it('fails when totalAmount is zero', async () => {
    const result = await validateOrderStep(makeOrderContext({ totalAmount: 0 }));
    expect(result.success).toBe(false);
    expect(result.error).toContain('positive');
  });

  it('fails when totalAmount is negative', async () => {
    const result = await validateOrderStep(makeOrderContext({ totalAmount: -5 }));
    expect(result.success).toBe(false);
    expect(result.error).toContain('positive');
  });
});

// ---------------------------------------------------------------------------

describe('processPaymentStep', () => {
  it('returns success:true and populates paymentId', async () => {
    // Payment gateway always succeeds — no random mock needed
    const result = await processPaymentStep(makeOrderContext());

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('paymentId');
    expect(result.data?.paymentId).toMatch(/^PAY-/);
    expect(result.data?.paymentStatus).toBe('completed');
  });
});

// ---------------------------------------------------------------------------

describe('checkInventoryStep', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('succeeds when external service returns available', async () => {
    mockRandomSuccess(); // 0.99 > 0.4 threshold → no failure
    const result = await checkInventoryStep(makeOrderContext());
    expect(result.success).toBe(true);
    expect(result.data?.inventoryChecked).toBe(true);
  });

  it('fails when external service returns transient error', async () => {
    mockRandomFailure(); // 0.01 < 0.4 threshold → simulated failure
    const result = await checkInventoryStep(makeOrderContext());
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('fails when an item quantity exceeds stock limit', async () => {
    mockRandomSuccess(); // bypass random failure so we reach quantity check
    const context = makeOrderContext({
      items: [{ productId: 'PROD-BULK', quantity: 101, price: 9.99 }],
    });
    const result = await checkInventoryStep(context);
    expect(result.success).toBe(false);
    expect(result.error).toContain('PROD-BULK');
  });
});

// ---------------------------------------------------------------------------

describe('sendNotificationStep', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('succeeds when notification service is available', async () => {
    mockRandomSuccess(); // 0.99 > 0.25 threshold → no failure
    const context = { ...makeOrderContext(), paymentId: 'PAY-123' };
    const result = await sendNotificationStep(context);
    expect(result.success).toBe(true);
    expect(result.data?.notificationSent).toBe(true);
  });

  it('fails when notification service is unavailable', async () => {
    mockRandomFailure(); // 0.01 < 0.25 threshold → simulated failure
    const result = await sendNotificationStep(makeOrderContext());
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------

describe('createShipmentStep', () => {
  it('succeeds when paymentId is in context', async () => {
    const context = { ...makeOrderContext(), paymentId: 'PAY-ABC' };
    const result = await createShipmentStep(context);
    expect(result.success).toBe(true);
    expect(result.data?.shipmentId).toMatch(/^SHIP-/);
    expect(result.data?.estimatedDelivery).toBeTruthy();
  });

  it('fails when paymentId is missing', async () => {
    const result = await createShipmentStep(makeOrderContext()); // no paymentId
    expect(result.success).toBe(false);
    expect(result.error).toContain('payment');
  });
});

// ---------------------------------------------------------------------------

describe('WorkflowExecutor', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('completes with COMPLETED status when all steps succeed', async () => {
    mockRandomSuccess(); // suppress all random failures

    const executor = new WorkflowExecutor('Order Processing', makeOrderContext());
    const run = await executor.execute(orderWorkflow);

    expect(run.status).toBe('COMPLETED');
    expect(run.error).toBeUndefined();
  }, 10000);

  it('propagates step data into context through the full workflow', async () => {
    mockRandomSuccess();

    const executor = new WorkflowExecutor('Order Processing', makeOrderContext());
    const run = await executor.execute(orderWorkflow);

    expect(run.context).toHaveProperty('paymentId');
    expect(run.context.paymentStatus).toBe('completed');
    expect(run.context).toHaveProperty('shipmentId');
    expect(run.context.notificationSent).toBe(true);
  }, 10000);

  it('marks workflow FAILED and records error when a step fails', async () => {
    mockRandomFailure(); // inventory step will fail on every attempt (including retries)

    const executor = new WorkflowExecutor('Order Processing', makeOrderContext());
    const run = await executor.execute(orderWorkflow);

    expect(run.status).toBe('FAILED');
    expect(run.error).toBeTruthy();

    const inventoryStep = run.steps.find((s) => s.stepKey === 'check_inventory');
    expect(inventoryStep?.status).toBe('FAILED');
  }, 15000);

  it('records all executed steps in run.steps', async () => {
    mockRandomSuccess();

    const executor = new WorkflowExecutor('Order Processing', makeOrderContext());
    const run = await executor.execute(orderWorkflow);

    const stepKeys = run.steps.map((s) => s.stepKey);
    expect(stepKeys).toContain('validate_order');
    expect(stepKeys).toContain('check_inventory');
    expect(stepKeys).toContain('process_payment');
    expect(stepKeys).toContain('create_shipment');
    expect(stepKeys).toContain('send_notification');
  }, 10000);

  it('does not execute steps after a failure', async () => {
    mockRandomFailure(); // inventory fails → payment, shipment, notification never run

    const executor = new WorkflowExecutor('Order Processing', makeOrderContext());
    const run = await executor.execute(orderWorkflow);

    const executedKeys = run.steps.map((s) => s.stepKey);
    expect(executedKeys).not.toContain('process_payment');
    expect(executedKeys).not.toContain('create_shipment');
    expect(executedKeys).not.toContain('send_notification');
  }, 15000);

  it('retryable steps are retried before failing the workflow', async () => {
    // inventory is retryable; make it fail every call
    mockRandomFailure();

    const executor = new WorkflowExecutor('Order Processing', makeOrderContext());
    await executor.execute(orderWorkflow);

    // With maxRetries=3, we expect up to 4 attempts (1 + 3 retries)
    // Math.random is called once per simulate call — verify multiple attempts happened
    // by counting random calls on the inventory step (each attempt calls random once)
    const randomCallCount = (Math.random as ReturnType<typeof vi.spyOn>).mock.calls.length;
    expect(randomCallCount).toBeGreaterThanOrEqual(2); // at least 1 retry occurred
  }, 20000);
});
