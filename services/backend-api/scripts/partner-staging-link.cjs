// Link only emitted staging artifacts; do not change P2 business source or Production build.
const fs=require('node:fs'),path=require('node:path');const root=path.resolve('dist');
const shared=path.join(root,'packages/shared-types/src');if(!fs.existsSync(shared))throw Error('STAGING_SHARED_ARTIFACT_MISSING');fs.cpSync(shared,path.join(root,'partner-platform'),{recursive:true});
function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const f=path.join(dir,e.name);if(e.isDirectory())walk(f);else if(f.endsWith('.js')){let s=fs.readFileSync(f,'utf8');s=s.replace(/require\(["']@karigo\/shared-types["']\)/g,()=>{const target=path.join(root,'partner-platform/index.js');if(!fs.existsSync(target))throw Error('STAGING_SHARED_ARTIFACT_MISSING');let rel=path.relative(path.dirname(f),target).replaceAll('\\','/');if(!rel.startsWith('.'))rel='./'+rel;return `require("${rel}")`;});fs.writeFileSync(f,s);}}}walk(root);
console.log('STAGING_EMITTED_WORKSPACE_LINKS_VERIFIED');
