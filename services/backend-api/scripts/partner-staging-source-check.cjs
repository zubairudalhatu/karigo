// Render checkouts need not contain ancestry/remotes. Verify P4 runtime bytes instead.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../../..'),manifest=JSON.parse(fs.readFileSync(path.join(root,'infra/partner-staging-p4-source.json'),'utf8'));
if(manifest.base!=='274db9823fcbd3f75ac525b41b69958163a24b31'||Object.keys(manifest.files).length<100)throw Error('STAGING_P4_SOURCE_MANIFEST_INVALID');
for(const [file,expected] of Object.entries(manifest.files)) {
 const source=fs.readFileSync(path.join(root,file),'utf8').replaceAll('\r\n','\n');
 if(crypto.createHash('sha256').update(source).digest('hex')!==expected)throw Error('STAGING_P4_RUNTIME_SOURCE_MISMATCH '+file);
}
console.log('PARTNER_STAGING_P4_RUNTIME_SOURCE_MATCH '+Object.keys(manifest.files).length);
