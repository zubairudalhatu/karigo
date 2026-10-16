"use client";
import {FormEvent,useEffect,useState} from "react";
import {api} from "../../src/api/client";
export default function GovernancePassword() {
 const [token,setToken]=useState("");const [email,setEmail]=useState("");const [password,setPassword]=useState("");const [busy,setBusy]=useState(false);const [message,setMessage]=useState("");
 useEffect(()=>{const value=window.location.hash.slice(1);if(/^[A-Za-z0-9_-]{43}$/.test(value))setToken(value);window.history.replaceState(null,"",window.location.pathname);},[]);
 async function submit(event:FormEvent){event.preventDefault();setBusy(true);setMessage("");try{
  if(token){await api.post("auth/admin-email/password/complete",{token,newPassword:password},{authenticated:false});setToken("");setPassword("");setMessage("Password set. Sign in with your verified work email.");}
  else{await api.post("auth/admin-email/password-reset/request",{email},{authenticated:false});setMessage("If the identity is eligible, a reset link will be sent to its verified mailbox.");}
 }catch{setMessage("The request could not be completed. The link may be expired or the service unavailable.");}finally{setBusy(false);}}
 return <main className="login"><form className="login-card" onSubmit={submit}><h1>{token?"Set governance password":"Reset governance password"}</h1>
 {token?<><p>Use at least 12 characters, including uppercase, lowercase and a number.</p><input aria-label="New password" type="password" autoComplete="new-password" minLength={12} maxLength={72} required value={password} onChange={e=>setPassword(e.target.value)}/></>:<input aria-label="Work email" type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)}/>}
 <button disabled={busy}>{busy?"Working...":token?"Verify email and set password":"Request reset link"}</button><p role="status">{message}</p><a href="/login">Back to sign-in</a></form></main>;
}
