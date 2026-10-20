const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path'),ts=require('typescript');
const root=path.resolve(__dirname,'..');const read=p=>fs.readFileSync(path.join(root,p),'utf8').replace(/\r\n/g,'\n');
function load(code,requireFn=()=>({})){const context={exports:{},module:{exports:{}},require:requireFn,Date};context.exports=context.module.exports;vm.runInNewContext(ts.transpileModule(code,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,context);return context.module.exports;}
const helpers=load(read('src/lib/captain-readiness.ts'));
const location={latitude:9.0765,longitude:7.3986,recordedAt:new Date(Date.now()-50).toISOString(),accuracyMeters:15,speedMetersPerSecond:4,headingDegrees:30};
const payload=helpers.toTransientReadinessLocation(location);assert.deepEqual(Object.keys(payload).sort(),['accuracyMeters','latitude','longitude','recordedAt']);
const future=new Date(Date.now()+20000).toISOString();const current={services:[{available:true}],readiness:{validUntil:future,capturedAt:location.recordedAt}};
assert.equal(helpers.isReadinessCurrent(current),true);assert.equal(helpers.isReadinessCurrent({...current,readiness:{...current.readiness,validUntil:new Date(Date.now()-1).toISOString()}}),false);
assert.equal(helpers.preferReadinessResult(current,{services:[]}),current,'late city-only response cannot erase valid fix');
for (const [service, label] of [[{areaState:'AREA_NOT_APPROVED'},'Area not approved'],[{areaState:'AREA_APPROVED',accessState:'CONTROLLED_ACCESS_REQUIRED'},'Controlled access required'],[{areaState:'AREA_APPROVED',available:true},'Eligible to go online']]) {
  assert.equal(helpers.captainReadinessLabel({...current,services:[{serviceType:'RIDES',...service}]},'RIDES'),label);
}
assert.equal(helpers.captainReadinessLabel(null,'RIDES'),'Locating');
const calls=[];const api=load(read('src/api/launch.api.ts'),name=>name==='./client'?{api:{post:(route,body)=>{calls.push({route,body});return Promise.resolve(current)},get:()=>{throw Error('unexpected GET')}}}:name.includes('captain-readiness')?helpers:{}).launchApi;
(async()=>{await api.readiness('Abuja',location);assert.equal(calls[0].route,'launch/availability/me/captain');assert.equal(calls[0].route.includes('?'),false);assert.deepEqual(Object.keys(calls[0].body).sort(),['accuracyMeters','city','latitude','longitude','recordedAt']);
const source=read('app/tabs/dashboard.tsx');const start=source.indexOf('  async function promoteReadinessLocation('),end=source.indexOf('\n  useEffect(',start);const promote=source.slice(start,end);
assert.ok(!promote.includes('updateAvailability'));assert.ok(!promote.includes('foregroundRideTracePoint'));assert.ok(!promote.includes('enableActiveWorkBackgroundLocation'));
let result=null,loading=false;const context={AppState:{currentState:'active'},latestProjectionRef:{current:{hasAnyActiveMode:true}},operationalLocationRequiredRef:{current:false},captainAccessRef:{current:{}},latestWorkStateRef:{current:{}},captainAvailabilityCity:()=> 'Abuja',setLaunchAvailabilityLoading:v=>loading=v,mountedRef:{current:true},setLaunchAvailability:fn=>result=fn(result),preferReadinessResult:helpers.preferReadinessResult,isReadinessCurrent:helpers.isReadinessCurrent,setLocationIssue:()=>{},launchApi:{readiness:async(city,fix)=>{assert.equal(fix,location);return current;}}};
vm.runInNewContext(ts.transpileModule(promote,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,context);await context.promoteReadinessLocation(location);assert.equal(result,current);assert.equal(loading,false);
let backgroundRequests=0;context.AppState.currentState='background';context.launchApi.readiness=()=>{backgroundRequests++;};await context.promoteReadinessLocation(location);assert.equal(backgroundRequests,0,'pending foreground fix cannot start an idle-background request');
assert.match(source,/const canStartRide = readinessAllowsOnline &&/);assert.match(source,/const canStartDelivery = readinessAllowsOnline &&/);assert.match(source,/const readinessAllowsOnline = isReadinessCurrent\(launchAvailability\)/);assert.match(source,/validUntil === until/);assert.match(source,/reasonCode: "LOCATION_STALE"/);
assert.match(source,/ageMs = Date.now\(\) - timestampValue\(record.location.recordedAt\)/);assert.match(source,/if \(hasAcceptedActiveWork\(workState\)\)/);
console.log('PASS: transient body-only readiness, no offline dispatch PATCH/traces/tracking, stale/racing response safety, fresh all-gates online control');
})().catch(e=>{console.error(e);process.exitCode=1});
