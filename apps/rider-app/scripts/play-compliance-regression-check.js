const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/lib/background-location.ts'), 'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function harness(options={}) {
  const calls=[]; let task, buttons, running=Boolean(options.running);
  let state={activeWorkMode:'RIDE',lockStage:'ACCEPTED'};
  const location={Accuracy:{Balanced:3},ActivityType:{AutomotiveNavigation:3},getForegroundPermissionsAsync:async()=>({granted:true}),requestBackgroundPermissionsAsync:async()=>{calls.push('permission');return {granted:options.permission!==false}},hasStartedLocationUpdatesAsync:async()=>running,startLocationUpdatesAsync:async()=>{calls.push('start'); if(options.start)await options.start(); running=true},stopLocationUpdatesAsync:async()=>{calls.push('stop');running=false}};
  const api={workState:async()=>{if(options.workState) return options.workState();return state},updateAvailability:async()=>{calls.push('upload');return state}};
  const dependencies={
    'react-native':{AppState:{currentState:'active'},Alert:{alert:(_title,_body,actions)=>{calls.push('disclosure');buttons=actions;if(options.consent!==undefined) actions[options.consent?1:0].onPress()}}},
    'expo-location':location,'expo-task-manager':{defineTask:(_name,callback)=>task=callback},
    '../api/captain-access.api':{captainAccessApi:api},'./location':{toOperationalLocationPayload:x=>x},
    './ride-trace-buffer':{bufferBackgroundRideTrace:async()=>{calls.push('buffer');return []},acknowledgeRideTracePoints:async()=>{}}
  };
  const module={exports:{}}; new Function('require','module','exports',code)(name=>{if(!(name in dependencies))throw Error(name);return dependencies[name]},module,module.exports);
  return {module:module.exports,calls,setState:s=>{state=s},task:()=>task,consent:()=>buttons[1].onPress(),running:()=>running};
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
(async()=>{
  let h=harness({consent:true}); await h.module.enableActiveWorkBackgroundLocation(); assert.deepEqual(h.calls,['disclosure','permission','start']);
  h=harness({consent:false}); assert.equal(await h.module.enableActiveWorkBackgroundLocation(),false); assert.deepEqual(h.calls,['disclosure']);
  h=harness({consent:true,permission:false}); assert.equal(await h.module.enableActiveWorkBackgroundLocation(),false); assert(!h.calls.includes('start'));
  for(const stage of ['OFFERED','ASSIGNED',null]) {h=harness({consent:true});h.setState({activeWorkMode:'RIDE',lockStage:stage});assert.equal(await h.module.enableActiveWorkBackgroundLocation(),false);assert.deepEqual(h.calls,[])}
  h=harness(); const pending=h.module.enableActiveWorkBackgroundLocation(); await tick(); const stopped=h.module.disableActiveWorkBackgroundLocation();h.consent();await Promise.all([pending,stopped]);assert(!h.calls.includes('permission'));assert(!h.calls.includes('start'));
  let release; const gate=new Promise(resolve=>release=resolve);h=harness({consent:true,start:()=>gate});const starting=h.module.enableActiveWorkBackgroundLocation();await tick();const ending=h.module.disableActiveWorkBackgroundLocation();release();await Promise.all([starting,ending]);assert.equal(h.running(),false);assert(h.calls.includes('stop'));
  h=harness({running:true});h.setState({activeWorkMode:null,lockStage:null});await h.task()({data:{locations:[{coords:{latitude:1,longitude:2},timestamp:1}]}});assert.deepEqual(h.calls,['stop']);assert.equal(h.running(),false);
  h=harness({consent:true});const waiting=h.module.enableActiveWorkBackgroundLocation();h.setState({activeWorkMode:null,lockStage:null});await waiting;assert(!h.calls.includes('start'));
  h=harness({running:true,workState:async()=>{throw Error('network unavailable')}});await h.task()({data:{locations:[{coords:{latitude:1,longitude:2},timestamp:1}]}});assert.deepEqual(h.calls,['stop']);assert.equal(h.running(),false);
  console.log('PASS: disclosure order, refusal, denied permission, unaccepted work, pending-consent cancellation, native-start cancellation, ended-work background rejection, and server-state recheck.');
})().catch(error=>{console.error(error);process.exitCode=1});
