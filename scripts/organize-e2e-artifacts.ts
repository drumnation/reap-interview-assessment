/**
 * Post-E2E script: organizes test artifacts with story-based filenames
 * and generates docs/E2E-RESULTS.md with linked screenshots and videos.
 *
 * Usage: tsx scripts/organize-e2e-artifacts.ts
 */
import fs from 'fs';
import path from 'path';

const RESULTS_JSON = path.resolve('e2e-results/results.json');
const OUTPUT_DIR = path.resolve('e2e-artifacts');
const DOCS_FILE = path.resolve('docs/E2E-RESULTS.md');

function slugify(title: string): string {
  return title
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .toLowerCase()
    .replace(/-+/g, '-')
    .substring(0, 80);
}

interface Attachment {
  name: string;
  contentType: string;
  path?: string;
  body?: string;
}

interface TestResult {
  status: string;
  duration: number;
  attachments: Attachment[];
}

interface Test {
  status: string;
  results: TestResult[];
}

interface Spec {
  title: string;
  tests: Test[];
}

interface Suite {
  title: string;
  specs: Spec[];
  suites?: Suite[];
}

interface Report {
  suites: Suite[];
}

interface Row {
  slug: string;
  title: string;
  status: string;
  duration: number;
  evidence?: string;
  video?: string;
  screenshot?: string;
  trace?: string;
}

function collectSpecs(suites: Suite[]): Spec[] {
  const specs: Spec[] = [];
  for (const suite of suites) {
    specs.push(...suite.specs);
    if (suite.suites) specs.push(...collectSpecs(suite.suites));
  }
  return specs;
}

function main() {
  if (!fs.existsSync(RESULTS_JSON)) {
    console.error('No results.json found. Run pnpm test:e2e:run first.');
    process.exit(1);
  }

  const report: Report = JSON.parse(fs.readFileSync(RESULTS_JSON, 'utf-8'));
  const specs = collectSpecs(report.suites);

  if (fs.existsSync(OUTPUT_DIR)) fs.rmSync(OUTPUT_DIR, { recursive: true });
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const rows: Row[] = [];

  for (const spec of specs) {
    const test = spec.tests[0];
    if (!test) continue;
    const result = test.results[0];
    if (!result) continue;

    const slug = slugify(spec.title);
    const row: Row = { slug, title: spec.title, status: result.status, duration: result.duration };

    for (const att of result.attachments) {
      // Text evidence uses body (base64), file attachments use path
      if (att.name === 'api-evidence' && att.body) {
        row.evidence = Buffer.from(att.body, 'base64').toString('utf-8');
        continue;
      }

      if (!att.path || !fs.existsSync(att.path)) continue;
      const ext = path.extname(att.path);

      if (att.contentType.includes('video')) {
        row.video = `${slug}${ext}`;
        fs.copyFileSync(att.path, path.join(OUTPUT_DIR, row.video));
      } else if (att.contentType.includes('image')) {
        row.screenshot = `${slug}.png`;
        fs.copyFileSync(att.path, path.join(OUTPUT_DIR, row.screenshot));
      } else if (att.contentType.includes('zip')) {
        row.trace = `${slug}-trace${ext}`;
        fs.copyFileSync(att.path, path.join(OUTPUT_DIR, row.trace));
      }
    }

    rows.push(row);
  }

  // Generate markdown
  const icon = (s: string) => s === 'passed' ? '✅' : s === 'failed' ? '❌' : '⚠️';
  const passed = rows.filter(r => r.status === 'passed').length;
  const failed = rows.filter(r => r.status === 'failed').length;

  const lines = [
    '# E2E Test Results',
    '',
    `> Generated: ${new Date().toISOString()}`,
    '',
    `**${passed}/${rows.length} passed** ${failed > 0 ? `(${failed} failed)` : ''}`,
    '',
    '| Story | Status | Duration | Artifacts |',
    '|-------|--------|----------|-----------|',
    ...rows.map(r => {
      const artifacts = [
        r.screenshot ? `[screenshot](../e2e-artifacts/${r.screenshot})` : '',
        r.video ? `[video](../e2e-artifacts/${r.video})` : '',
        r.trace ? `[trace](../e2e-artifacts/${r.trace})` : '',
      ].filter(Boolean).join(' · ');
      return `| ${icon(r.status)} ${r.title} | ${r.status} | ${r.duration}ms | ${artifacts} |`;
    }),
    '',
    '## Details',
    '',
    ...rows.flatMap(r => [
      `### ${icon(r.status)} ${r.title}`,
      '',
      ...(r.screenshot ? [`![${r.title}](../e2e-artifacts/${r.screenshot})`, ''] : []),
      ...(r.evidence ? [
        '<details><summary>Proof Chain + API Log</summary>',
        '',
        '```',
        r.evidence,
        '```',
        '</details>',
        '',
      ] : []),
      ...(r.video ? [`Video: [${r.video}](../e2e-artifacts/${r.video})`, ''] : []),
      ...(r.trace ? [`Trace: \`pnpm exec playwright show-trace e2e-artifacts/${r.trace}\``, ''] : []),
    ]),
  ];

  fs.mkdirSync(path.dirname(DOCS_FILE), { recursive: true });
  fs.writeFileSync(DOCS_FILE, lines.join('\n'));

  console.log(`✅ ${rows.length} artifacts organized into e2e-artifacts/`);
  console.log(`📄 ${DOCS_FILE}`);
  for (const r of rows) {
    const files = [r.screenshot, r.video, r.trace].filter(Boolean);
    console.log(`   ${icon(r.status)} ${r.slug}: ${files.join(', ')}`);
  }
}

main();
