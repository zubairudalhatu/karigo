const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');const ts=require('typescript');
const base=path.resolve(__dirname,'../src/lib');
const cache=new Map();function load(file){if(cache.has(file))return cache.get(file);const result={exports:{}};
 const compiled=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const customRequire=id=>id==='@karigo/config'?{normalizeApiBaseUrl:value=>value}:id.startsWith('.')?load(path.resolve(path.dirname(file),id+'.ts')):require(id);
 new Function('require','module','exports',compiled)(customRequire,result,result.exports);cache.set(file,result.exports);return result.exports;}
process.env.API_BASE_URL='https://synthetic-backend.example/api/v1';process.env.NODE_ENV='production';
const {handleBffRequest}=load(path.join(base,'bff-session.ts'));
function request(method,cookies={},body={},csrf=true){return {method,nextUrl:new URL('https://synthetic-admin.example/api/bff/auth/login'),headers:new Headers({'content-type':'application/json',origin:'https://synthetic-admin.example',...(csrf?{'x-karigo-csrf':'synthetic-csrf'}:{})}),cookies:{get:key=>cookies[key]?{value:cookies[key]}:undefined},arrayBuffer:async()=>new TextEncoder().encode(JSON.stringify(body)).buffer};}
const response=data=>new Response(JSON.stringify({data}),{status:200,headers:{'content-type':'application/json'}});
(async()=>{
 const calls=[];global.fetch=async(url,options)=>{calls.push({url:String(url),options});return response({user:{id:'synthetic',role:'ADMIN',adminRole:'RESTORE_GOVERNANCE'},accessToken:'synthetic-access-only'});};
 const login=await handleBffRequest(request('POST',{}, {email:'synthetic@example.invalid',password:'not-real'}),['auth','admin-email','login']);
 const payload=await login.json();assert(!JSON.stringify(payload).includes('synthetic-access-only'));assert.equal(login.cookies.get('karigo_admin_mode').value,'governance');assert.equal(login.cookies.get('karigo_admin_access').httpOnly,true);assert.equal(login.cookies.get('karigo_admin_refresh').value,'');
 global.fetch=async(url,options)=>{calls.push({url:String(url),options});return response({id:'synthetic',role:'ADMIN',adminRole:'RESTORE_GOVERNANCE'});};
 const cookies={karigo_admin_mode:'governance',karigo_admin_access:'synthetic-access-only',karigo_admin_csrf:'synthetic-csrf'};
 await handleBffRequest(request('GET',cookies),['auth','me']);assert(calls.at(-1).url.endsWith('/auth/admin-email/me'));assert.equal(calls.at(-1).options.headers.get('Authorization'),'Bearer synthetic-access-only');
 const denied=await handleBffRequest(request('POST',cookies,{},false),['auth','logout']);assert.equal(denied.status,403);
 const logout=await handleBffRequest(request('POST',cookies),['auth','logout']);assert(calls.at(-1).url.endsWith('/auth/admin-email/logout'));assert.equal(logout.cookies.get('karigo_admin_access').value,'');assert.equal(logout.cookies.get('karigo_admin_mode').value,'');
 console.log('Governance BFF session isolation, HttpOnly cookies, token stripping, identity routing, CSRF and logout: PASS');
})().catch(error=>{console.error(error.message);process.exitCode=1;});
