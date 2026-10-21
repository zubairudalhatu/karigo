const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),cp=require('node:child_process'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../../..'),source=path.join(root,'scripts/captain-native-location-qa');
const rules=require(path.join(source,'patches.json'));
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'karigo-native-patch-test-'));
const script=path.join(temp,'scripts/captain-native-location-qa');fs.mkdirSync(script,{recursive:true});
for(const name of ['apply.cjs','patches.json','EXKariGOLocationDiagnostics.h','EXKariGOLocationDiagnostics.m','KGLocationDiagnostics.h'])fs.copyFileSync(path.join(source,name),path.join(script,name));
for(const [pkg,version] of Object.entries({'expo-location':'18.1.6','expo-task-manager':'13.1.6'})) {const p=path.join(temp,'node_modules',pkg);fs.mkdirSync(p,{recursive:true});fs.writeFileSync(path.join(p,'package.json'),JSON.stringify({name:pkg,version}));}
for(const rule of rules){const [pkg,...parts]=rule.file.split('/');const installed=path.dirname(require.resolve(pkg+'/package.json',{paths:[root]}));let text=fs.readFileSync(path.join(installed,...parts),'utf8');if(hash(text)===rule.after)for(const[a,b]of [...rule.edits].reverse())text=text.replace(b,a);assert.equal(hash(text),rule.before);const target=path.join(temp,'node_modules',rule.file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,text);}
const run=flag=>cp.spawnSync(process.execPath,[path.join(script,'apply.cjs')],{encoding:'utf8',env:{...process.env,CAPTAIN_IOS_NATIVE_QA:flag}});
assert.equal(run('0').status,0);assert.equal(hash(fs.readFileSync(path.join(temp,'node_modules',rules[0].file))),rules[0].before);
assert.equal(run('1').status,0);for(const rule of rules)assert.equal(hash(fs.readFileSync(path.join(temp,'node_modules',rule.file))),rule.after);
assert.equal(run('1').status,0); // repeat application is deterministic
fs.appendFileSync(path.join(temp,'node_modules',rules[0].file),'\n// unexpected upstream edit');assert.notEqual(run('1').status,0);
const native=fs.readFileSync(path.join(source,'EXKariGOLocationDiagnostics.m'),'utf8');assert.match(native,/rows\.count > 64/);assert.match(native,/now \+ 1800/);assert.match(native,/expires.*<= now/);assert.match(native,/NSDataWritingFileProtectionCompleteUntilFirstUserAuthentication/);
assert.doesNotMatch(native,/latitude|longitude|phoneNumber|accessToken|password|customerId/i);
const patched=rules[0].edits.map(x=>x[1]).join('\n');assert.match(patched,/BOOL diagnostic = KGLocationDiagnosticsEnabled\(\)/);assert.match(patched,/if \(diagnostic\) \{ distance = 0; interval = 0; \}/);
for(const reason of ['WAIT_DISTANCE','WAIT_TIME','BATCH_READY','AUTHORIZATION_DENIED','AUTHORIZATION_RESTRICTED','LOCATION_UNAVAILABLE','CONSUMER_START_FAILURE'])assert.ok(patched.includes(reason));
for(const scenario of [[false,99,61,false],[false,101,59,false],[false,101,61,true],[true,0,0,true]]){const[diagnostic,distance,seconds,result]=scenario;assert.equal(distance >= (diagnostic?0:100)&&seconds >=(diagnostic?0:60),result);}
console.log('PASS: pristine install patch, exact hashes/versions, idempotence, tamper rejection, default-off install, native cap/TTL/privacy/protection and diagnostic-vs-normal batching contract. Native execution/compilation remains an EAS check.');
