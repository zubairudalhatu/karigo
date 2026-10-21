const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const hash = data => crypto.createHash('sha256').update(data).digest('hex');
if (process.env.CAPTAIN_IOS_NATIVE_QA !== '1') {
  console.log('Captain native QA patch: disabled; native dependencies unchanged.');
  process.exit(0);
}
const packageRoot = name => path.dirname(require.resolve(name + '/package.json', { paths: [root] }));
const expected = { 'expo-location': '18.1.6', 'expo-task-manager': '13.1.6' };
for (const [name, version] of Object.entries(expected)) {
  if (JSON.parse(fs.readFileSync(path.join(packageRoot(name), 'package.json'))).version !== version) throw Error('Unsupported native QA package version: ' + name);
}
const rules = require('./patches.json');
// Validate every input before writing any patch. No silent fuzzy matching.
const prepared = rules.map(rule => {
  const [pkg, ...parts] = rule.file.split('/');
  const target = path.join(packageRoot(pkg), ...parts);
  const text = fs.readFileSync(target, 'utf8');
  if (hash(text) === rule.after) return { target, text };
  if (hash(text) !== rule.before) throw Error('Native source hash mismatch: ' + rule.file);
  let patched = text;
  for (const [before, after] of rule.edits) {
    if (patched.split(before).length !== 2) throw Error('Native patch anchor mismatch: ' + rule.file);
    patched = patched.replace(before, after);
  }
  if (hash(patched) !== rule.after) throw Error('Native patch output mismatch: ' + rule.file);
  return { target, text: patched };
});
for (const { target, text } of prepared) fs.writeFileSync(target, text);
for (const [file, pkg, relative] of [
  ['EXKariGOLocationDiagnostics.h', 'expo-task-manager', 'ios/EXTaskManager'],
  ['EXKariGOLocationDiagnostics.m', 'expo-task-manager', 'ios/EXTaskManager'],
  ['KGLocationDiagnostics.h', 'expo-location', 'ios/TaskConsumers']
]) fs.copyFileSync(path.join(__dirname, file), path.join(packageRoot(pkg), relative, file));
console.log('Captain iOS native QA patch applied and verified: expo-location18.1.6 / task-manager13.1.6.');
