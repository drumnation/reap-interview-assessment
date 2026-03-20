import * as React from 'react';
import { CheckCircle2, XCircle, RefreshCw, Clock, AlertCircle } from 'lucide-react';

export type WorkflowStepProps = {
  step: {
    stepName: string;
    status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SKIPPED';
    error?: string;
    durationMs?: number;
  };
  index: number;
};

const statusIcons: Record<string, React.ReactNode> = {
  COMPLETED: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  FAILED: <XCircle className="h-4 w-4 text-red-500" />,
  RUNNING: <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />,
  PENDING: <Clock className="h-4 w-4 text-gray-400" />,
  SKIPPED: <AlertCircle className="h-4 w-4 text-yellow-500" />,
};

export function WorkflowStep({ step, index }: WorkflowStepProps) {
  return (
    <div className="flex items-center justify-between p-3 bg-white rounded border">
      <div className="flex items-center gap-3">
        <span className="text-gray-400 text-sm w-6">{index + 1}.</span>
        {statusIcons[step.status]}
        <span className={step.status === 'FAILED' ? 'text-red-700' : ''}>
          {step.stepName}
        </span>
      </div>
      <div className="flex items-center gap-4">
        {step.durationMs !== undefined && (
          <span className="text-sm text-gray-500">{step.durationMs}ms</span>
        )}
        {step.error && (
          <span className="text-sm text-red-600 max-w-xs truncate" title={step.error}>
            {step.error}
          </span>
        )}
      </div>
    </div>
  );
}
