export type Result = { ok: true; data: unknown } | { ok: false; error: string };

export function ok(data: unknown): Result {
  return { ok: true, data };
}

export function err(error: string): Result {
  return { ok: false, error };
}
