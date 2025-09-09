/**
 * Build a single SQL bundle from bootstrap, migrations, and function files.
 * Output: sql/deploy_bundle.sql
 * Usage: node scripts/build-sql-bundle.js
 */

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const sqlDir = path.join(root, 'sql');
const migrationsDir = path.join(sqlDir, 'migrations');
const outFile = path.join(sqlDir, 'deploy_bundle.sql');

function readIfExists(p) {
  if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8');
  return '';
}

function main() {
  if (!fs.existsSync(sqlDir)) {
    console.error('❌ sql folder not found at', sqlDir);
    process.exit(1);
  }

  const parts = [];

  const header = `-- deploy_bundle.sql
-- Generated at ${new Date().toISOString()}
-- Paste this into Supabase SQL Editor and run.
-- Note: No transaction wrapper to allow CREATE EXTENSION.
`;
  parts.push(header);

  // 1) Bootstrap
  const bootstrapPath = path.join(sqlDir, 'bootstrap_schema.sql');
  if (fs.existsSync(bootstrapPath)) {
    parts.push('\n-- ================= BOOTSTRAP =================');
    parts.push(readIfExists(bootstrapPath));
  }

  // 2) Migrations (sorted by filename)
  if (fs.existsSync(migrationsDir)) {
    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.toLowerCase().endsWith('.sql'))
      .sort();
    if (files.length) {
      parts.push('\n-- ================= MIGRATIONS =================');
      for (const f of files) {
        const p = path.join(migrationsDir, f);
        parts.push(`\n-- ---- ${f} ----`);
        parts.push(readIfExists(p));
      }
    }
  }

  // 3) App functions (reports, dashboards)
  const appFns = path.join(sqlDir, 'app_functions.sql');
  if (fs.existsSync(appFns)) {
    parts.push('\n-- ================= APP FUNCTIONS =================');
    parts.push(readIfExists(appFns));
  }

  // 4) Sales document functions
  const salesFns = path.join(sqlDir, 'sales_document_functions.sql');
  if (fs.existsSync(salesFns)) {
    parts.push('\n-- ================= SALES DOCUMENT FUNCTIONS =================');
    parts.push(readIfExists(salesFns));
  }

  // Join and write
  const content = parts.join('\n\n');
  fs.writeFileSync(outFile, content);
  console.log('✅ SQL bundle written to:', outFile);
  console.log('ℹ️  Next: Open Supabase → SQL Editor, paste the file content, and Run.');
}

if (require.main === module) {
  try {
    main();
  } catch (e) {
    console.error('❌ Failed to build SQL bundle:', e.message);
    process.exit(1);
  }
}
