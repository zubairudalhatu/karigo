const assert=require('node:assert/strict'), fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const root=path.resolve(__dirname,'../../..');
function harness({values=new Map(),readError=null,platform='android'}={}) {
 const cache=new Map(),calls=[],events=[];let fetcher=()=>{throw Error('unexpected network')};
 const writes=[];const storage={AFTER_FIRST_UNLOCK:1,getItemAsync:async k=>{if(readError)throw readError;return values.get(k)??null;},setItemAsync:async(k,v,o)=>{writes.push({key:k,options:o});values.set(k,v);},deleteItemAsync:async k=>values.delete(k)};
 const load=file=>{file=path.resolve(file);if(cache.has(file))return cache.get(file).exports;const m={exports:{}};cache.set(file,m);const src=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const req=name=>{if(name==='react-native')return {Platform:{OS:platform},AppState:{currentState:'active'}};if(name==='expo-secure-store')return storage;if(name==='@karigo/shared-types')return load(root+'/packages/shared-types/src/api.ts');if(name==='@karigo/config')return {...load(root+'/packages/config/src/api.ts'),...load(root+'/packages/config/src/mobile-session.ts'),logMobileAuthDiagnostic:()=>{},validateMobileApiBaseUrl:()=> 'https://invalid.local/api/v1'};if(name.startsWith('.'))return load(path.resolve(path.dirname(file),name+'.ts'));throw Error('headless test forbids '+name);};
 new Function('require','module','exports','fetch','process',src)(req,m,m.exports,async(...a)=>{calls.push(a);return fetcher(...a);},{env:{}});return m.exports;};
 const client=load(root+'/apps/rider-app/src/api/client.ts'), bg=load(root+'/apps/rider-app/src/lib/background-session.ts');
 return {client,bg,values,calls,events,writes,read:()=>bg.readBackgroundSession(client.authSessionStore,async e=>events.push(e)),fetch:fn=>fetcher=fn};
}
const reply=(status,data,code)=>({ok:status===200,status,json:async()=>status===200?{success:true,data}:{success:false,error_code:code}});
(async()=>{
 const h=harness();await h.client.authSessionStore.persistTokenPair('LOCAL_EXPIRED_ACCESS','LOCAL_REFRESH');
 assert((await h.read()).accessToken);assert.equal(h.events.at(-1).sessionAvailable,true);
 // A/B: entirely new module runtime, durable storage retained, no React/UI imports permitted.
 const cold=harness({values:h.values});assert.equal(cold.client.authSessionStore.currentGeneration(),0);assert((await cold.read()).refreshToken);
 const absent=harness();assert.equal(await absent.read(),null);assert.equal(absent.events.at(-1).reason,'SESSION_NOT_PERSISTED');
 for(const [error,reason]of [[Error('PRIVATE token/phone/coordinate'),'SECURESTORE_READ_ERROR'],[{code:-25308},'SECURESTORE_PROTECTED_DATA_UNAVAILABLE'],[{protectedDataAvailable:false},'SECURESTORE_PROTECTED_DATA_UNAVAILABLE']]){
 const x=harness({readError:error});await assert.rejects(x.read());assert.equal(x.events.at(-1).reason,reason);assert(!JSON.stringify(x.events).includes('PRIVATE'));assert.equal(x.calls.length,0);}
 const corrupt=harness({values:new Map([['karigo_captain_session_v2','PRIVATE invalid JSON']])});await assert.rejects(corrupt.read());assert.equal(corrupt.events.at(-1).reason,'TOKEN_PARSE_FAILURE');
 const pairless=harness({values:new Map([['karigo_captain_session_v2',JSON.stringify({schemaVersion:2,accessToken:'LOCAL',savedAt:'now',sessionGeneration:0})]])});await assert.rejects(pairless.read());assert.equal(pairless.events.at(-1).reason,'TOKEN_PARSE_FAILURE');
 // E: expiry is server-validated, not guessed from a locally parsed JWT.
 let n=0;cold.fetch(async url=>{if(url.endsWith('/auth/refresh'))return reply(200,{accessToken:'LOCAL_NEW_ACCESS',refreshToken:'LOCAL_NEW_REFRESH'});return ++n===1?reply(401,null,'ACCESS_TOKEN_EXPIRED'):reply(200,{id:'LOCAL_TEST_ID'});});
 assert.equal((await cold.client.api.get('/auth/me')).id,'LOCAL_TEST_ID');assert.equal(cold.calls.filter(x=>x[0].endsWith('/auth/refresh')).length,1);assert.equal((await cold.read()).accessToken,'LOCAL_NEW_ACCESS');
 assert.equal(cold.bg.backgroundSessionFailure({name:'SessionTemporarilyUnavailableError'}),'REFRESH_FAILED');
 for(const reason of cold.bg.backgroundAuthReasons) assert.equal(cold.bg.backgroundSessionFailure({errorCode:reason}),reason);
 const readHints=[];const inspected=cold.bg.diagnosedSessionStorage({getItemAsync:async()=>null,setItemAsync:async()=>{},deleteItemAsync:async()=>{}},reason=>readHints.push(reason));await inspected.getItemAsync('local-key');assert.deepEqual(readHints,['SECURESTORE_RETURNED_NULL']);
 const missingRefresh=cold.bg.diagnosedSessionStorage({getItemAsync:async()=>JSON.stringify({accessToken:'LOCAL'}),setItemAsync:async()=>{},deleteItemAsync:async()=>{}},reason=>readHints.push(reason));await missingRefresh.getItemAsync('karigo_captain_session_v2');assert.equal(readHints.at(-1),'REFRESH_TOKEN_UNAVAILABLE');
 
 const temporary=harness({values:new Map(h.values)});temporary.fetch(async url=>reply(url.endsWith('/auth/refresh')?503:401,null,'SERVICE_UNAVAILABLE'));await assert.rejects(temporary.client.api.get('/auth/me'));assert(await temporary.read(),'temporary refresh failure preserves credentials');
 const revoked=harness({values:new Map(h.values)});revoked.fetch(async url=>reply(401,null,url.endsWith('/auth/refresh')?'REFRESH_TOKEN_REVOKED':'ACCESS_TOKEN_EXPIRED'));await assert.rejects(revoked.client.api.get('/auth/me'));assert.equal(await revoked.read(),null);
 await cold.client.authSessionStore.clearSession();assert.equal(await cold.read(),null);assert.equal(cold.values.size,0);
 await h.client.authSessionStore.resetSavedLogin();assert.equal(h.values.size,0);
 const deletion=fs.readFileSync(root+'/apps/rider-app/app/account-deletion.tsx','utf8');assert(deletion.includes('await logout()'),'account deletion uses normal credential/tracker cleanup');
 const auth=fs.readFileSync(root+'/apps/rider-app/src/contexts/auth-context.tsx','utf8');assert(auth.includes('await authSessionStore.clearSession(generation)'));assert(auth.includes('disableActiveWorkBackgroundLocation()'));
 const source=fs.readFileSync(root+'/apps/rider-app/src/lib/background-session.ts','utf8');assert(!source.includes('console.'));assert(!source.includes('JSON.stringify'));
 const swift=fs.readFileSync(root+'/node_modules/expo-secure-store/ios/SecureStoreModule.swift','utf8');assert(swift.includes('let updateDictionary = [kSecValueData as String: valueData]'),'review is pinned to installed overwrite semantics');
 // Actual iOS client wiring: login, cold durable read, refresh and revoked cleanup.
 const jwt=()=>['LOCAL',Buffer.from(JSON.stringify({exp:Math.floor(Date.now()/1000)+3600})).toString('base64url'),'LOCAL'].join('.');
 const ios=harness({platform:'ios'});await ios.client.authSessionStore.persistTokenPair(jwt(),'LOCAL_REFRESH',ios.client.authSessionStore.beginNewSession());assert(ios.values.has('karigo_captain_session_v3'));assert(!ios.values.has('karigo_captain_session_v2'));let iosRequests=0;ios.fetch(async url=>url.endsWith('/auth/refresh')?reply(200,{accessToken:jwt(),refreshToken:'LOCAL_ROTATED'}):++iosRequests===1?reply(401,null,'ACCESS_TOKEN_EXPIRED'):reply(200,{id:'LOCAL_TEST_ID'}));assert.equal((await ios.client.api.get('/auth/me')).id,'LOCAL_TEST_ID');assert.equal((await ios.read()).refreshToken,'LOCAL_ROTATED');assert(ios.writes.every(w=>w.options.keychainAccessible===1&&w.options.requireAuthentication===false));const iosCold=harness({platform:'ios',values:ios.values});assert(await iosCold.read());iosCold.fetch(async url=>reply(401,null,url.endsWith('/auth/refresh')?'REFRESH_TOKEN_REVOKED':'ACCESS_TOKEN_EXPIRED'));await assert.rejects(iosCold.client.api.get('/auth/me'));assert.equal(await iosCold.read(),null);assert(!iosCold.values.has('karigo_captain_session_v3')&&!iosCold.values.has('karigo_captain_session_v2'));
 console.log('PASS headless/cold durable session; no React/cache dependency; null/read-error/protected-data/interaction/parse classification; expiry refresh; temporary failure; revocation; logout/reset cleanup; no secrets in evidence.');
})().catch(e=>{console.error(e);process.exitCode=1});
