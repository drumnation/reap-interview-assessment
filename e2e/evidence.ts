import type { Page, TestInfo } from '@playwright/test';

export interface ApiCall {
  method: string;
  url: string;
  status: number;
  duration: number;
}

export interface Assertion {
  claim: string;
  expected: string;
  actual: string;
  pass: boolean;
}

export interface Evidence {
  apiCalls: ApiCall[];
  assertions: Assertion[];
}

export function createEvidence(page: Page): Evidence {
  const evidence: Evidence = { apiCalls: [], assertions: [] };
  const pending = new Map<string, number>();

  page.on('request', (req) => {
    if (req.url().includes('/api/') && !req.url().includes('/api/auth/')) {
      pending.set(req.url() + req.method(), Date.now());
    }
  });

  page.on('response', (res) => {
    const key = res.url() + res.request().method();
    const start = pending.get(key);
    if (start !== undefined) {
      evidence.apiCalls.push({
        method: res.request().method(),
        url: res.url().replace(/https?:\/\/[^/]+/, ''),
        status: res.status(),
        duration: Date.now() - start,
      });
      pending.delete(key);
    }
  });

  return evidence;
}

/** Record a named assertion with expected vs actual values */
export function prove(evidence: Evidence, claim: string, expected: string, actual: string) {
  evidence.assertions.push({ claim, expected, actual, pass: expected === actual });
}

/** Record a numeric comparison assertion */
export function proveComparison(
  evidence: Evidence,
  claim: string,
  operator: '=' | '>' | '>=' | '<' | '<=' | '!=',
  left: number,
  right: number,
  leftLabel: string = String(left),
  rightLabel: string = String(right),
) {
  const ops: Record<string, (a: number, b: number) => boolean> = {
    '=': (a, b) => a === b,
    '>': (a, b) => a > b,
    '>=': (a, b) => a >= b,
    '<': (a, b) => a < b,
    '<=': (a, b) => a <= b,
    '!=': (a, b) => a !== b,
  };
  const pass = ops[operator](left, right);
  evidence.assertions.push({
    claim,
    expected: `${leftLabel} ${operator} ${rightLabel}`,
    actual: `${left} ${operator} ${right} → ${pass}`,
    pass,
  });
}

/** Attach the full evidence report to the test */
export async function attachEvidence(testInfo: TestInfo, evidence: Evidence, bugDescription: string) {
  const lines: string[] = [];

  lines.push(`BUG: ${bugDescription}`);
  lines.push('='.repeat(60));
  lines.push('');

  // Proof chain
  lines.push('PROOF CHAIN');
  lines.push('-'.repeat(40));
  for (const a of evidence.assertions) {
    const icon = a.pass ? '✅ PROVED' : '❌ FAILED';
    lines.push(`${icon}: ${a.claim}`);
    lines.push(`   Expected: ${a.expected}`);
    lines.push(`   Actual:   ${a.actual}`);
    lines.push('');
  }

  // API log
  lines.push('API REQUEST LOG');
  lines.push('-'.repeat(40));
  for (const c of evidence.apiCalls) {
    const icon = c.status >= 200 && c.status < 300 ? '✅' : '❌';
    lines.push(`${icon} ${c.method} ${c.url} → ${c.status} (${c.duration}ms)`);
  }
  lines.push('');

  const passed = evidence.assertions.filter(a => a.pass).length;
  const total = evidence.assertions.length;
  lines.push(`VERDICT: ${passed}/${total} assertions proved`);

  await testInfo.attach('api-evidence', { body: lines.join('\n'), contentType: 'text/plain' });
}
