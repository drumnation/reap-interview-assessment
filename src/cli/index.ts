#!/usr/bin/env tsx
import { executeCommand } from './commands';

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    args.push('help');
  }

  const result = await executeCommand(args);
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.ok ? 0 : 1);
}

main().catch((err) => {
  console.error(JSON.stringify({ ok: false, error: err.message }));
  process.exit(1);
});
