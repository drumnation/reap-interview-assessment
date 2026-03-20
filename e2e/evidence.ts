import type { Page, TestInfo } from '@playwright/test';

export interface ApiCall {
  method: string;
  url: string;
  status: number;
  duration: number;
}

/**
 * Attaches an API request log to the test as a named artifact.
 * Captures method, URL, status, and duration for every /api/ call.
 */
export function collectApiEvidence(page: Page, testInfo: TestInfo): ApiCall[] {
  const calls: ApiCall[] = [];
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
      calls.push({
        method: res.request().method(),
        url: res.url().replace(/https?:\/\/[^/]+/, ''),
        status: res.status(),
        duration: Date.now() - start,
      });
      pending.delete(key);
    }
  });

  return calls;
}

/**
 * Attaches the collected API evidence as a text artifact on the test.
 */
export async function attachEvidence(testInfo: TestInfo, calls: ApiCall[], label: string) {
  const lines = calls.map(
    (c) => `${c.status === 200 ? '✅' : '❌'} ${c.method} ${c.url} → ${c.status} (${c.duration}ms)`
  );
  const body = `API Evidence: ${label}\n${'='.repeat(60)}\n${lines.join('\n')}\n\nTotal: ${calls.length} requests, ${calls.filter(c => c.status >= 200 && c.status < 300).length} succeeded`;

  await testInfo.attach('api-evidence', { body, contentType: 'text/plain' });
}
