// Produce a minimal source-free Cloud Run image context. No backend env files,
// credentials, database configuration or Customer exports enter this context.
const ts = require('typescript');
const fs = require('node:fs');
const path = require('node:path');
const out = process.argv[2];
if (!out || !path.isAbsolute(out)) throw new Error('Absolute output directory required');
fs.mkdirSync(out, { recursive: true });
for (const name of ['gcs-export-deadlines', 'gcs-export-deadlines-job']) {
  const source = fs.readFileSync(path.join(__dirname, '../src/modules/account-deletion', name + '.ts'), 'utf8');
  const result = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS }, reportDiagnostics: true });
  if (result.diagnostics.some(x => x.category === ts.DiagnosticCategory.Error)) throw new Error('Controller compilation failed');
  fs.writeFileSync(path.join(out, name + '.js'), result.outputText);
}
fs.writeFileSync(path.join(out, 'Dockerfile'), 'FROM node:22.20.0-bookworm-slim\nWORKDIR /app\nCOPY gcs-export-deadlines.js gcs-export-deadlines-job.js ./\nUSER node\nCMD ["node", "gcs-export-deadlines-job.js"]\n');
fs.writeFileSync(path.join(out, '.dockerignore'), '*\n!Dockerfile\n!gcs-export-deadlines.js\n!gcs-export-deadlines-job.js\n');
console.log('Minimal synthetic-only controller build context prepared');
