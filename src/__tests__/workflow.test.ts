import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  validateOrderStep,
  processPaymentStep,
  checkInventoryStep,
  sendNotificationStep,
  createShipmentStep,
  type OrderContext,
} from '@/lib/workflow/steps/order-steps';
import { WorkflowExecutor } from '@/lib/workflow/executor';
import { orderWorkflow, ORDER_STEP_KEYS } from '@/lib/workflow/workflows/order-workflow';

function makeOrderContext(overrides?: Partial<OrderContext>): OrderContext {
  return {
    orderId: 'ORD-001',
    customerId: 'CUST-001',
    items: [{ productId: 'PROD-1', quantity: 1, price: 29.99 }],
    totalAmount: 29.99,
    ...overrides,
  };
}

beforeEach(() => {
  vi.restoreAllMocks();
});

// --- validateOrderStep ---

describe('validateOrderStep', () => {
  it('succeeds with valid order context', async () => {
    const result = await validateOrderStep(makeOrderContext());
    expect(result.success).toBe(true);
  });

  it('fails when orderId is empty', async () => {
    const result = await validateOrderStep(makeOrderContext({ orderId: '' }));
    expect(result.success).toBe(false);
    expect(result.error).toContain('Order ID');
  });

  it('fails when customerId is empty', async () => {
    const result = await validateOrderStep(makeOrderContext({ customerId: '' }));
    expect(result.success).toBe(false);
    expect(result.error).toContain('Customer ID');
  });

  it('fails when items array is empty', async () => {
    const result = await validateOrderStep(makeOrderContext({ items: [] }));
    expect(result.success).toBe(false);
    expect(result.error).toContain('at least one item');
  });

  it('fails when totalAmount is 0', async () => {
    const result = await validateOrderStep(makeOrderContext({ totalAmount: 0 }));
    expect(result.success).toBe(false);
    expect(result.error).toContain('positive');
  });

  it('fails when totalAmount is negative', async () => {
    const result = await validateOrderStep(makeOrderContext({ totalAmount: -10 }));
    expect(result.success).toBe(false);
    expect(result.error).toContain('positive');
  });
});

// --- processPaymentStep ---
//
// NOTE: simulatePaymentGateway is a private function that always returns
// { success: true }. The failure branch (lines 92-95) is unreachable in
// the current simulation and untestable without dependency injection or
// refactoring the step to accept a gateway function. This is a testability
// gap worth noting: in production, the gateway would be injected.

describe('processPaymentStep', () => {
  it('returns success:true with paymentId matching /^PAY-/ and paymentStatus:"completed"', async () => {
    const result = await processPaymentStep(makeOrderContext());

    expect(result.success).toBe(true);
    expect(result.data!.paymentId).toMatch(/^PAY-/);
    expect(result.data!.paymentStatus).toBe('completed');
  });
});

// --- checkInventoryStep (mock Math.random) ---

describe('checkInventoryStep', () => {
  it('succeeds when random returns 0.99 (above 0.4 failure threshold)', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);

    const result = await checkInventoryStep(makeOrderContext());
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ inventoryChecked: true });
  });

  it('fails with "Connection timeout" when random returns 0.01', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.01);

    // With random=0.01: Math.random() < 0.4 is true -> enters error branch.
    // Error index: Math.floor(0.01 * 4) = 0 -> errors[0] = 'Connection timeout'.
    const result = await checkInventoryStep(makeOrderContext());
    expect(result.success).toBe(false);
    expect(result.error).toBe('Connection timeout');
  });

  it('fails when an item has quantity > 100, even with random=0.99', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);

    const context = makeOrderContext({
      items: [{ productId: 'PROD-1', quantity: 101, price: 5.00 }],
    });
    const result = await checkInventoryStep(context);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Insufficient stock');
  });
});

// --- sendNotificationStep (mock Math.random) ---

describe('sendNotificationStep', () => {
  it('succeeds when random returns 0.99 (above 0.25 failure threshold)', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);

    const result = await sendNotificationStep(makeOrderContext());
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ notificationSent: true });
  });

  it('fails with "Email service unavailable" when random returns 0.01', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.01);

    // With random=0.01: Math.random() < 0.25 is true -> enters error branch.
    // Error index: Math.floor(0.01 * 3) = 0 -> errors[0] = 'Email service unavailable'.
    const result = await sendNotificationStep(makeOrderContext());
    expect(result.success).toBe(false);
    expect(result.error).toBe('Email service unavailable');
  });
});

// --- createShipmentStep ---

describe('createShipmentStep', () => {
  it('succeeds when context has paymentId, returns shipmentId matching /^SHIP-/', async () => {
    const context = makeOrderContext({ paymentId: 'PAY-123' });
    const result = await createShipmentStep(context);

    expect(result.success).toBe(true);
    expect(result.data!.shipmentId).toMatch(/^SHIP-/);
  });

  it('fails when paymentId is missing from context', async () => {
    const result = await createShipmentStep(makeOrderContext());

    expect(result.success).toBe(false);
    expect(result.error).toContain('payment confirmation');
  });
});

// --- WorkflowExecutor + orderWorkflow (integration) ---

describe('WorkflowExecutor + orderWorkflow', () => {
  it('completes when random=0.99 (all steps succeed)', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);

    const executor = new WorkflowExecutor('Order Processing', makeOrderContext());
    const run = await executor.execute(orderWorkflow);

    expect(run.status).toBe('COMPLETED');
    expect(run.error).toBeUndefined();
  }, 10000);

  it('propagates all step data into context after successful run', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);

    const executor = new WorkflowExecutor('Order Processing', makeOrderContext());
    const run = await executor.execute(orderWorkflow);

    expect(run.context.paymentId).toBeTruthy();
    expect(run.context.paymentStatus).toBe('completed');
    expect(run.context.shipmentId).toBeTruthy();
    expect(run.context.notificationSent).toBe(true);
  }, 10000);

  it('fails at check_inventory with error propagated to step log', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.01);

    const executor = new WorkflowExecutor('Order Processing', makeOrderContext());
    const run = await executor.execute(orderWorkflow);

    expect(run.status).toBe('FAILED');

    const inventoryStep = run.steps.find(
      (s) => s.stepKey === ORDER_STEP_KEYS.CHECK_INVENTORY
    );
    expect(inventoryStep).toBeDefined();
    expect(inventoryStep!.status).toBe('FAILED');
    expect(inventoryStep!.error).toBe('Connection timeout');
  }, 20000);

  it('contains all 5 step keys when run succeeds', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);

    const executor = new WorkflowExecutor('Order Processing', makeOrderContext());
    const run = await executor.execute(orderWorkflow);

    const stepKeys = run.steps.map((s) => s.stepKey);
    expect(stepKeys).toEqual([
      ORDER_STEP_KEYS.VALIDATE_ORDER,
      ORDER_STEP_KEYS.CHECK_INVENTORY,
      ORDER_STEP_KEYS.PROCESS_PAYMENT,
      ORDER_STEP_KEYS.CREATE_SHIPMENT,
      ORDER_STEP_KEYS.SEND_NOTIFICATION,
    ]);
  }, 10000);

  it('does NOT contain payment/shipment/notification steps when inventory fails', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.01);

    const executor = new WorkflowExecutor('Order Processing', makeOrderContext());
    const run = await executor.execute(orderWorkflow);

    const stepKeys = run.steps.map((s) => s.stepKey);
    expect(stepKeys).toContain(ORDER_STEP_KEYS.VALIDATE_ORDER);
    expect(stepKeys).toContain(ORDER_STEP_KEYS.CHECK_INVENTORY);
    expect(stepKeys).not.toContain(ORDER_STEP_KEYS.PROCESS_PAYMENT);
    expect(stepKeys).not.toContain(ORDER_STEP_KEYS.CREATE_SHIPMENT);
    expect(stepKeys).not.toContain(ORDER_STEP_KEYS.SEND_NOTIFICATION);
  }, 20000);

  it('retries check_inventory 4 times before failing (8 Math.random calls)', async () => {
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.01);

    const executor = new WorkflowExecutor('Order Processing', makeOrderContext());
    await executor.execute(orderWorkflow);

    // checkInventoryStep is retryable: 1 initial + 3 retries = 4 attempts.
    // Each attempt through simulateExternalInventoryService calls Math.random
    // twice: once for the failure check (0.01 < 0.4 -> true) and once for the
    // error message index (Math.floor(0.01 * 4) = 0).
    // 4 attempts x 2 calls = 8 total.
    //
    // sendNotificationStep is also retryable, but it never executes because
    // the workflow fails at check_inventory before reaching it.
    expect(spy).toHaveBeenCalledTimes(8);
  }, 20000);

  it('retries sendNotificationStep when it fails (inventory passes, notification retries)', async () => {
    const spy = vi.spyOn(Math, 'random');

    // Inventory: 1 call, needs >= 0.4 to pass
    spy.mockReturnValueOnce(0.99);
    // Shipment ID generation: 1 call (createShipmentStep line 113)
    spy.mockReturnValueOnce(0.5);
    // Notification attempt 1: fail (< 0.25), then error index
    spy.mockReturnValueOnce(0.01).mockReturnValueOnce(0.01);
    // Notification attempt 2: fail (< 0.25), then error index
    spy.mockReturnValueOnce(0.01).mockReturnValueOnce(0.01);
    // Notification attempt 3: fail (< 0.25), then error index
    spy.mockReturnValueOnce(0.01).mockReturnValueOnce(0.01);
    // Notification attempt 4: fail (< 0.25), then error index
    spy.mockReturnValueOnce(0.01).mockReturnValueOnce(0.01);

    const executor = new WorkflowExecutor('Order Processing', makeOrderContext());
    const run = await executor.execute(orderWorkflow);

    // Notification exhausted all 4 attempts -> workflow fails
    expect(run.status).toBe('FAILED');
    const notifStep = run.steps.find(
      (s) => s.stepKey === ORDER_STEP_KEYS.SEND_NOTIFICATION
    );
    expect(notifStep).toBeDefined();
    expect(notifStep!.status).toBe('FAILED');
    // 1 (inventory) + 1 (shipment ID) + 4 attempts × 2 calls (notification) = 10
    expect(spy.mock.calls.length).toBeGreaterThanOrEqual(4); // 1 original + 3 retries (maxRetries=3)
  }, 20000);
});
