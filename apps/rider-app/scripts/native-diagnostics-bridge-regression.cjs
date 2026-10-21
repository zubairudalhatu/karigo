const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const file=path.join(__dirname,'../src/lib/native-location-diagnostics.ts');
const compiled=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
function load(platform,flag,native){let lookups=0;const exports={};const sandbox={exports,process:{env:{EXPO_PUBLIC_CAPTAIN_NATIVE_LOCATION_QA:flag}},require:name=>{if(name==='react-native')return {Platform:{OS:platform}};if(name==='expo-modules-core')return {requireOptionalNativeModule:()=>{lookups++;return native}};throw Error(name)}};vm.runInNewContext(compiled,sandbox);return {api:exports,lookups:()=>lookups};}
(async()=>{
 for(const [platform,flag]of [['android','true'],['ios','false']]){const r=load(platform,flag,null);assert.equal(r.api.nativeLocationQaAvailable,false);assert.equal(await r.api.armNativeLocationEvidence(),false);assert.equal(await r.api.readNativeLocationEvidence(),null);await r.api.clearNativeLocationEvidence();assert.equal(r.lookups(),0);}
 const oldBinary=load('ios','true',{});assert.equal(oldBinary.api.nativeLocationQaAvailable,false);assert.equal(await oldBinary.api.armNativeLocationEvidence(),false);assert.equal(await oldBinary.api.readNativeLocationEvidence(),null);
 const calls=[];const r=load('ios','true',{karigoNativeLocationQaArm:async()=>{calls.push('arm');return true},karigoNativeLocationQaRead:async()=>{calls.push('read');return {enabled:true,maxEvents:64,retentionSeconds:1800,events:[]}},karigoNativeLocationQaClear:async()=>calls.push('clear')});
 assert.equal(r.api.nativeLocationQaAvailable,true);assert.equal(await r.api.armNativeLocationEvidence(),true);assert.equal((await r.api.readNativeLocationEvidence()).maxEvents,64);await r.api.clearNativeLocationEvidence();assert.deepEqual(calls,['arm','read','clear']);
 console.log('PASS: Android/flag-off never load native diagnostics; old native binaries fail safely; Build2 arm/read/clear call only explicit native APIs.');
})().catch(e=>{console.error(e);process.exitCode=1});
