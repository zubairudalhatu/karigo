"use client";
import { useAuth } from "../../src/contexts/auth-context";
import { PortalShell } from "../../src/components/portal";
export default function RestoreGovernance() {
 const {user}=useAuth();
 return <PortalShell>{user?.adminRole==="RESTORE_GOVERNANCE"
  ? <section><h2>Restore release remains blocked</h2><p>Signing in does not assign a restore authority. A separately approved UUID roster and verified release workflow are required before any approval action is available.</p></section>
  : <p>A dedicated restore-governance identity is required.</p>}
 </PortalShell>;
}
