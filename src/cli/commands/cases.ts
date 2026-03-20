import { Command } from 'commander';
import { prisma } from '@/lib/prisma';
import { ok, err, type Result } from '../result';

export async function listCases(): Promise<Result> {
  const cases = await prisma.case.findMany({
    select: { id: true, residentName: true, facilityName: true, status: true },
    orderBy: { createdAt: 'desc' },
  });
  return ok(cases);
}

export async function getCase(id: string): Promise<Result> {
  const c = await prisma.case.findFirst({ where: { id } });
  return c ? ok(c) : err(`Case ${id} not found`);
}

export function registerCasesCommand(program: Command) {
  const cases = program.command('cases').description('Manage Medicaid cases');

  cases
    .command('list')
    .description('List all cases')
    .action(async () => {
      const result = await listCases();
      console.log(JSON.stringify(result, null, 2));
      process.exitCode = result.ok ? 0 : 1;
    });

  cases
    .command('get <id>')
    .description('Get a case by ID')
    .action(async (id: string) => {
      const result = await getCase(id);
      console.log(JSON.stringify(result, null, 2));
      process.exitCode = result.ok ? 0 : 1;
    });
}
