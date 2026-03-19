import type { StepDefinition, WorkflowDefinition, WorkflowRun, StepLog, StepStatus, WorkflowStatus } from './types';

async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 50
): Promise<T> {
  let lastError: Error;
  const maxAttempts = 1 + maxRetries;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxAttempts - 1) {
        await new Promise((r) => setTimeout(r, baseDelayMs * Math.pow(2, attempt)));
      }
    }
  }
  throw lastError!;
}

/**
 * Simple workflow executor
 *
 * Executes workflow steps in sequence and tracks their status.
 * Each step receives the workflow context and can return updates to it.
 */
export class WorkflowExecutor<TContext extends Record<string, unknown>> {
  private workflowRun: WorkflowRun;

  constructor(workflowName: string, initialContext: TContext) {
    this.workflowRun = {
      id: crypto.randomUUID(),
      workflowName,
      status: 'PENDING',
      context: { ...initialContext },
      steps: [],
      startedAt: new Date(),
    };
  }

  async execute(definition: WorkflowDefinition<TContext>): Promise<WorkflowRun> {
    this.workflowRun.status = 'RUNNING';

    try {
      for (const stepDef of definition.steps) {
        await this.executeStep(stepDef);
      }

      this.workflowRun.status = 'COMPLETED';
      this.workflowRun.completedAt = new Date();
    } catch (error) {
      this.workflowRun.status = 'FAILED';
      this.workflowRun.completedAt = new Date();
      this.workflowRun.error = error instanceof Error ? error.message : 'Unknown error';
    }

    return this.workflowRun;
  }

  private async executeStep(stepDef: StepDefinition<TContext>): Promise<void> {
    const stepLog: StepLog = {
      stepKey: stepDef.key,
      stepName: stepDef.name,
      status: 'RUNNING',
      startedAt: new Date(),
    };

    this.workflowRun.steps.push(stepLog);

    const attemptStep = async () => {
      const result = await stepDef.execute(this.workflowRun.context as TContext);

      if (!result.success) {
        throw new Error(result.error || 'Step execution failed');
      }

      return result;
    };

    try {
      const result = stepDef.retryable
        ? await withRetry(attemptStep)
        : await attemptStep();

      // Merge any returned data into context
      if (result.data) {
        this.workflowRun.context = {
          ...this.workflowRun.context,
          ...result.data,
        };
      }

      stepLog.status = 'COMPLETED';
      stepLog.result = result;
      stepLog.completedAt = new Date();
    } catch (error) {
      stepLog.status = 'FAILED';
      stepLog.error = error instanceof Error ? error.message : 'Unknown error';
      stepLog.completedAt = new Date();
      throw error;
    }
  }

  getWorkflowRun(): WorkflowRun {
    return this.workflowRun;
  }
}
