// Deterministic loaded-state rendering of the actual Home component; no native build.
const fs=require("node:fs"),path=require("node:path"),ts=require("typescript"),vm=require("node:vm"),assert=require("node:assert/strict");
const input=JSON.parse(fs.readFileSync(process.argv[2],"utf8").replace(/^\uFEFF/,""));
assert(!input.failed && input.source && input.dashboard);
const d=input.dashboard;
function render(model){
 let hook=0;
 const states=[{profile:model.profile,orders:model.orders,products:model.products,services:model.services,documents:[],capabilities:model.capabilities},false,false,false,{state:"approved"},null,null,false,model.launch,model.operations,model.commercial,null,false];
 const element=(type,props,...children)=>{props={...props,children:children.length===1?children[0]:children};return typeof type==="function"?type(props):{type,props};};
 const React={createElement:element,Fragment:"fragment",useState:()=>[states[hook++],()=>{}],useCallback:f=>f,useEffect:()=>{}};
 const wrap=tag=>p=>element(tag,{},p.children);
 const ui={Screen:wrap("screen"),Card:wrap("card"),MutedText:wrap("text"),Badge:p=>element("badge",{},p.label),StatCard:p=>element("stat",{},p.label,":",p.value),Hero:p=>element("hero",{},p.eyebrow,p.title,p.subtitle),PrimaryButton:p=>element("button",{disabled:!!p.disabled},p.label),EmptyState:p=>element("empty",{},p.title,p.body)};
 const context={React,exports:{},require:id=>{
 if(id==="react")return React;
 if(id==="react-native")return {View:wrap("view"),Text:wrap("text"),Image:()=>null,RefreshControl:()=>null,StyleSheet:{create:x=>x},Linking:{}};
 if(id==="expo-router")return {useRouter:()=>({push:()=>{}})};
 if(id==="@karigo/config")return {brand:{colors:{charcoal:"#000"}}};
 if(id==="@karigo/shared-types")return {KariGoApiError:class extends Error{}};
 if(id.includes("/components/ui"))return ui;
 if(id.includes("auth-gate"))return {AuthGate:wrap("auth")};
 if(id.includes("auth-context"))return {useAuth:()=>({user:{fullName:"Synthetic Partner"},logout:()=>{}})};
 if(id.includes("partner-profile"))return {partnerProfileWarning:p=>/staging/i.test(p.businessName)?{title:"Partner record requires confirmation",body:"Synthetic fixture"}:null};
 if(id.includes("/lib/labels"))return {formatLabel:x=>x??"",statusTone:()=>"neutral"};
 if(id.endsWith(".png"))return 1;
 if(id.includes("permanent-account-deletion"))return {PermanentAccountDeletion:()=>null};
 if(id.includes("/api/"))return {};
 throw Error("Unexpected Home dependency: "+id);
 }};
 const source=fs.readFileSync(path.resolve(__dirname,"../app/index.tsx"),"utf8");
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,target:ts.ScriptTarget.ES2022}}).outputText,context);
 const tree=context.exports.default();
 const text=n=>n==null||typeof n==="boolean"?"":Array.isArray(n)?n.map(text).join(" "):typeof n==="object"?text(n.props.children):String(n);
 return {text:text(tree),tree};
}
const r=render(d),t=r.text.replace(/\s+/g," ").replace(/\s*\/\s*/g,"/");
assert(t.includes(`${d.operations.activeBranchCount}/${d.operations.branchCount} branches active`));
assert(t.includes(`Notifications · ${d.operations.unreadNotifications} unread`));
assert(t.includes("Active orders")&&t.includes("View earnings and settlements")&&t.includes("Availability"));
assert(t.includes(d.profile.isOpen?"Go Offline":"Go Online"));
assert.equal(t.includes("Add product"),!!d.capabilities.canManageProducts);
assert.equal(t.includes("Add service"),!!d.capabilities.canManageServices);
assert.equal(t.includes("Commercial plan"),!!d.commercial?.agreement);
assert(t.includes(d.profile.businessName));
const active=d.orders.filter(o=>!["DELIVERED","CANCELLED","REJECTED"].includes(o.orderStatus));
assert(t.includes(`Active orders : ${active.length}`));
if(active[0])assert(t.includes(active[0].orderNumber));
if(d.capabilities.canManageProducts)assert(t.includes(`Products : ${d.products.length}`));
if(d.capabilities.canManageServices)assert(t.includes(`Services : ${d.services.length}`));
if(!d.commercial?.agreement){const c=render({...d,commercial:{agreement:{publicTitle:"Synthetic staging plan",policyVersion:"1",commercialModel:"COMMISSION",commissionPercent:5,onboardingFeeKobo:null},feeState:"ACCEPTED"}});assert(c.text.includes("Commercial plan")&&c.text.includes("Synthetic staging plan"));}
console.log("P41_HOME_RENDER_PASS hosted_source="+input.source+"; summary/orders/catalogue/earnings/availability/notifications/commercial conditional verified; native layout deferred");
