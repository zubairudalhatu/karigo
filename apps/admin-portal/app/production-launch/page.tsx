"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  ControlledCandidate,
  ControlledMonitor,
  ControlledOperationsCustomer,
  ControlledReadiness,
  ControlledSupplyGroup,
  ControlledSupplyMemberType,
  DailyLaunchReport,
  LaunchCohort,
  LaunchCommandCentre,
  LaunchConfig,
  LaunchDrill,
  LaunchHistoryItem,
  LaunchIncident,
  LaunchReadiness,
  LaunchServiceType,
  LaunchStage,
  LaunchSupportQueue,
  OperationsChecklist,
  productionLaunchApi,
  QuickLaunchCandidate,
  QuickLaunchContext,
  QuickLaunchDiscoveryPage,
  QuickLaunchIdentityDiagnostics,
  QuickLaunchSession,
  ReadinessStatus
} from "../../src/api/production-launch.api";
import { Badge, Empty, ErrorMessage, Loading, PortalShell } from "../../src/components/portal";
import { friendlyError } from "../../src/lib/errors";

const stages: LaunchStage[] = ["OFF", "OPERATIONS_ONLY", "INVITE_ONLY", "LIMITED_PUBLIC", "CITY_WIDE", "PAUSED"];
const services: LaunchServiceType[] = ["RIDES", "FOOD", "GROCERIES", "MARKETPLACE", "PARCEL_DELIVERY", "SME_SERVICES"];
const readinessStatuses: ReadinessStatus[] = ["NOT_READY", "AT_RISK", "READY", "WAIVED"];
const drillTypes = ["RIDE_END_TO_END", "DELIVERY_END_TO_END", "PRODUCT_ORDER_END_TO_END", "SERVICE_REQUEST_END_TO_END", "PAYMENT_SUCCESS", "PAYMENT_FAILURE", "CUSTOMER_CANCELLATION", "CAPTAIN_CANCELLATION", "PARTNER_REJECTION", "SUPPORT_ESCALATION", "EMERGENCY_SERVICE_PAUSE"];
type View = "quick" | "command" | "controlled" | "checklist" | "readiness" | "supply" | "cohorts" | "incidents" | "support" | "drills" | "reports" | "history";

function label(value: string) {
  return value.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function dateTime(value?: string | null) {
  return value ? new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Not recorded";
}

function ConfigEditor({ config, onSaved }: { config: LaunchConfig; onSaved: () => Promise<void> }) {
  const [stage, setStage] = useState(config.launchStage);
  const [enabled, setEnabled] = useState(config.isEnabled);
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [highImpact, setHighImpact] = useState(false);
  const [maxConcurrent, setMaxConcurrent] = useState(config.maxConcurrentRequests?.toString() ?? "");
  const [maxUnassigned, setMaxUnassigned] = useState(config.maxUnassignedRequests?.toString() ?? "");
  const [minCaptains, setMinCaptains] = useState(config.minimumOnlineCaptainCount?.toString() ?? "");
  const [minPartners, setMinPartners] = useState(config.minimumOnlinePartnerCount?.toString() ?? "");
  const [operatingHours, setOperatingHours] = useState(config.operatingHours ? JSON.stringify(config.operatingHours, null, 2) : "");
  const [allowedZones, setAllowedZones] = useState(Array.isArray(config.allowedZoneIds) ? config.allowedZoneIds.join(", ") : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const highImpactRequired = stage === "CITY_WIDE" || stage === "PAUSED";

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const optionalNumber = (value: string) => value.trim() ? Number(value) : undefined;
      let parsedOperatingHours: unknown = {};
      if (operatingHours.trim()) {
        try {
          parsedOperatingHours = JSON.parse(operatingHours);
        } catch {
          throw new Error("Operating hours must be valid JSON using Africa/Lagos local times.");
        }
      }
      await productionLaunchApi.updateConfig(config.cityCode, config.serviceType, {
        launchStage: stage,
        isEnabled: enabled,
        reason,
        confirmed,
        highImpactConfirmed: highImpact,
        pausedReason: stage === "PAUSED" ? reason : undefined,
        maxConcurrentRequests: optionalNumber(maxConcurrent),
        maxUnassignedRequests: optionalNumber(maxUnassigned),
        minimumOnlineCaptainCount: optionalNumber(minCaptains),
        minimumOnlinePartnerCount: optionalNumber(minPartners),
        operatingHours: parsedOperatingHours,
        allowedZoneIds: allowedZones.split(",").map((item) => item.trim()).filter(Boolean)
      });
      setReason("");
      setConfirmed(false);
      setHighImpact(false);
      await onSaved();
    } catch (cause) {
      setError(friendlyError(cause, "form"));
    } finally {
      setSaving(false);
    }
  }

  return <article className="card">
    <h3>{label(config.serviceType)}</h3>
    <p><Badge>{config.launchStage}</Badge> <Badge>{config.isEnabled ? "Enabled" : "Disabled"}</Badge></p>
    <form onSubmit={(event) => void save(event)}>
      <label>Launch stage<select value={stage} onChange={(event) => setStage(event.target.value as LaunchStage)}>{stages.map((item) => <option key={item}>{item}</option>)}</select></label>
      <label className="check-row"><input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />Enabled at this stage</label>
      <div className="form-grid">
        <label>Max concurrent<input inputMode="numeric" value={maxConcurrent} onChange={(event) => setMaxConcurrent(event.target.value)} /></label>
        <label>Max unassigned<input inputMode="numeric" value={maxUnassigned} onChange={(event) => setMaxUnassigned(event.target.value)} /></label>
        <label>Minimum online Captains<input inputMode="numeric" value={minCaptains} onChange={(event) => setMinCaptains(event.target.value)} /></label>
        <label>Minimum online Partners<input inputMode="numeric" value={minPartners} onChange={(event) => setMinPartners(event.target.value)} /></label>
      </div>
      <label>Eligible zone IDs (comma separated)<input value={allowedZones} onChange={(event) => setAllowedZones(event.target.value)} placeholder="Leave empty for the full supported city" /></label>
      <label>Operating hours (Africa/Lagos JSON)<textarea value={operatingHours} onChange={(event) => setOperatingHours(event.target.value)} placeholder={'{"weekly":{"mon":{"open":"08:00","close":"20:00"}},"holidayOverrides":{}}'} /></label>
      <label>Required reason<textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Record the operational reason. Do not enter credentials or personal data." required /></label>
      <label className="check-row"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />I confirm this city/service change.</label>
      {highImpactRequired ? <label className="check-row"><input type="checkbox" checked={highImpact} onChange={(event) => setHighImpact(event.target.checked)} />Second confirmation for city-wide activation or pause.</label> : null}
      <ErrorMessage>{error}</ErrorMessage>
      <button disabled={saving || !confirmed || !reason.trim() || (highImpactRequired && !highImpact)}>{saving ? "Saving..." : "Apply audited change"}</button>
    </form>
  </article>;
}

export default function ProductionLaunchPage() {
  const [view, setView] = useState<View>("quick");
  const [command, setCommand] = useState<LaunchCommandCentre | null>(null);
  const [configs, setConfigs] = useState<LaunchConfig[]>([]);
  const [readiness, setReadiness] = useState<LaunchReadiness[]>([]);
  const [cohorts, setCohorts] = useState<LaunchCohort[]>([]);
  const [incidents, setIncidents] = useState<LaunchIncident[]>([]);
  const [drills, setDrills] = useState<LaunchDrill[]>([]);
  const [support, setSupport] = useState<LaunchSupportQueue | null>(null);
  const [report, setReport] = useState<DailyLaunchReport | null>(null);
  const [history, setHistory] = useState<LaunchHistoryItem[]>([]);
  const [controlledGroups, setControlledGroups] = useState<ControlledSupplyGroup[]>([]);
  const [controlledCustomers, setControlledCustomers] = useState<ControlledOperationsCustomer[]>([]);
  const [controlledReadiness, setControlledReadiness] = useState<ControlledReadiness[]>([]);
  const [controlledMonitor, setControlledMonitor] = useState<ControlledMonitor[]>([]);
  const [controlledAudit, setControlledAudit] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [nextCommand, nextConfigs, kano, abuja, nextCohorts, nextIncidents, nextDrills, nextSupport, nextReport, nextHistory, nextGroups, nextCustomers, nextControlledReadiness, nextMonitor, nextControlledAudit] = await Promise.all([
        productionLaunchApi.commandCentre(), productionLaunchApi.configs(), productionLaunchApi.readiness("Kano"), productionLaunchApi.readiness("Abuja"), productionLaunchApi.cohorts(), productionLaunchApi.incidents(), productionLaunchApi.drills(), productionLaunchApi.supportQueue(), productionLaunchApi.report(), productionLaunchApi.history(), productionLaunchApi.controlledGroups(), productionLaunchApi.controlledCustomers(), productionLaunchApi.controlledReadiness(), productionLaunchApi.controlledMonitor(), productionLaunchApi.controlledAudit()
      ]);
      setCommand(nextCommand); setConfigs(nextConfigs); setReadiness([kano, abuja]); setCohorts(nextCohorts); setIncidents(nextIncidents); setDrills(nextDrills); setSupport(nextSupport); setReport(nextReport); setHistory(nextHistory);
      setControlledGroups(nextGroups); setControlledCustomers(nextCustomers); setControlledReadiness(nextControlledReadiness); setControlledMonitor(nextMonitor); setControlledAudit(nextControlledAudit);
    } catch (cause) {
      setError(friendlyError(cause));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function action(fn: () => Promise<unknown>, success: string) {
    setError(""); setMessage("");
    try { await fn(); setMessage(success); await load(); } catch (cause) { setError(friendlyError(cause, "form")); }
  }

  return <PortalShell>
    <h1>Production Launch</h1>
    <p className="muted">Kano and Abuja operations control. All city/service records default to OFF. No stage advances automatically, active work is not cancelled, and customer demand remains server-gated by stage, account eligibility, hours, zone and capacity.</p>
    <div className="actions">
      {(["quick", "command", "controlled", "checklist", "readiness", "supply", "cohorts", "incidents", "support", "drills", "reports", "history"] as View[]).map((item) => <button key={item} className={view === item ? "" : "secondary"} onClick={() => setView(item)}>{item === "quick" ? "Quick Launch" : label(item)}</button>)}
      <button className="secondary" onClick={() => void load()}>Refresh</button>
    </div>
    {message ? <p className="success">{message}</p> : null}
    <ErrorMessage>{error}</ErrorMessage>
    {loading ? <Loading /> : null}

    {!loading && view === "quick" ? <QuickLaunchView reload={load} /> : null}

    {!loading && view === "command" && command ? <>
      <section className="grid">
        <article className="card"><span className="muted">API health</span><p><Badge>{command.apiHealth.status}</Badge></p></article>
        <article className="card"><span className="muted">Open support cases</span><p className="metric">{command.supportMetrics.openCases ?? 0}</p></article>
        <article className="card"><span className="muted">Urgent support cases</span><p className="metric">{command.supportMetrics.urgentCases ?? 0}</p></article>
        <article className="card"><span className="muted">Last refresh</span><p>{dateTime(command.generatedAt)}</p></article>
      </section>
      {command.cities.map((city) => <section className="section" key={city.city.code}>
        <h2>{city.city.name} command centre</h2>
        <div className="grid">
          <article className="card"><span className="muted">Readiness score</span><p className="metric">{city.readiness.percentage}%</p><p>{city.readiness.ready}/{city.readiness.total} categories ready or validly waived</p></article>
          <article className="card"><span className="muted">Open Ride requests</span><p className="metric">{city.demand.openRides ?? 0}</p><p>Unassigned: {city.demand.unassignedRides ?? 0}</p></article>
          <article className="card"><span className="muted">Active orders / services</span><p className="metric">{city.demand.activeOrders ?? 0} / {city.demand.activeServices ?? 0}</p></article>
          <article className="card"><span className="muted">Open incidents</span><p className="metric">{city.openIncidents}</p><p className="muted">Unresolved launch incidents for this city</p></article>
          <article className="card"><span className="muted">Latest operational reference</span><p>{city.lastSuccessfulOperationalTransaction ? `${city.lastSuccessfulOperationalTransaction.type} ${city.lastSuccessfulOperationalTransaction.reference}` : "No successful transaction recorded"}</p><p className="muted">{dateTime(city.lastSuccessfulOperationalTransaction?.at)}</p></article>
        </div>
        <div className="grid">{configs.filter((item) => item.cityCode === city.city.code).map((config) => <ConfigEditor key={config.id} config={config} onSaved={load} />)}</div>
      </section>)}
    </> : null}

    {!loading && view === "readiness" ? readiness.map((city) => <section className="section" key={city.city.code}>
      <h2>{city.city.name} readiness: {city.score.percentage}%</h2>
      <p className="muted">The score informs but never automatically changes a launch stage. WAIVED requires a reason and future expiry.</p>
      <table className="table"><thead><tr><th>Category</th><th>Status</th><th>Note / waiver</th><th>Action</th></tr></thead><tbody>{city.items.map((item) => <ReadinessRow key={item.id} city={city.city.code} item={item} onSave={(payload) => action(() => productionLaunchApi.updateReadiness(city.city.code, item.id, payload), "Readiness item updated and audited.")} />)}</tbody></table>
    </section>) : null}

    {!loading && view === "supply" && command ? <SupplyView command={command} /> : null}
    {!loading && view === "controlled" ? <ControlledSupplyView groups={controlledGroups} customers={controlledCustomers} readiness={controlledReadiness} monitor={controlledMonitor} audit={controlledAudit} action={action} reload={load} /> : null}
    {!loading && view === "checklist" ? <OperationsChecklistView action={action} /> : null}
    {!loading && view === "cohorts" ? <CohortsView cohorts={cohorts} action={action} /> : null}
    {!loading && view === "incidents" ? <IncidentsView incidents={incidents} action={action} /> : null}
    {!loading && view === "drills" ? <DrillsView drills={drills} groups={controlledGroups} customers={controlledCustomers} action={action} /> : null}
    {!loading && view === "support" ? <SupportView support={support} /> : null}
    {!loading && view === "reports" ? <ReportsView report={report} /> : null}
    {!loading && view === "history" ? <HistoryView history={history} /> : null}
  </PortalShell>;
}

function ControlledSupplyView({ groups, customers, readiness, monitor, audit, action, reload }: {
  groups: ControlledSupplyGroup[];
  customers: ControlledOperationsCustomer[];
  readiness: ControlledReadiness[];
  monitor: ControlledMonitor[];
  audit: Array<Record<string, unknown>>;
  action: (fn: () => Promise<unknown>, message: string) => Promise<void>;
  reload: () => Promise<void>;
}) {
  const [groupName, setGroupName] = useState("");
  const [city, setCity] = useState("KANO");
  const [serviceType, setServiceType] = useState<LaunchServiceType>("RIDES");
  const [maximumMembers, setMaximumMembers] = useState("4");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [groupId, setGroupId] = useState("");
  const [memberType, setMemberType] = useState<ControlledSupplyMemberType>("RIDE_CAPTAIN");
  const [identityId, setIdentityId] = useState("");
  const [customerUserId, setCustomerUserId] = useState("");
  const [customerLabel, setCustomerLabel] = useState("");
  const [captains, setCaptains] = useState<ControlledCandidate[]>([]);
  const [partners, setPartners] = useState<ControlledCandidate[]>([]);
  const [eligibilityError, setEligibilityError] = useState("");
  const captainType = ["RIDE_CAPTAIN", "DELIVERY_CAPTAIN", "DUAL_MODE_CAPTAIN"].includes(memberType);

  async function loadEligibility() {
    setEligibilityError("");
    try {
      const [nextCaptains, nextPartners] = await Promise.all([
        productionLaunchApi.controlledCaptains(city, serviceType),
        productionLaunchApi.controlledPartners(city, serviceType)
      ]);
      setCaptains(nextCaptains); setPartners(nextPartners);
    } catch (cause) { setEligibilityError(friendlyError(cause, "form")); }
  }

  return <>
    <section className="section">
      <h2>Controlled Captain and Partner activation</h2>
      <p className="muted">These controls reference existing approved accounts. They never recreate identities, activate payouts, enable automatic matching, or change a city/service launch stage.</p>
      <div className="grid">
        {readiness.map((item) => <article className="card" key={item.city.code}>
          <h3>{item.city.name} controlled supply</h3>
          <p><Badge>{item.drillReady ? "DRILL_READY" : "NOT_READY"}</Badge></p>
          {Object.entries(item.targets).map(([key, value]) => <p key={key}>{label(key)}: <strong>{value}</strong> / {item.requiredTargets[key]} configured minimum</p>)}
          <p className="muted">{item.recommendation}</p>
          <p>Invite rollout ready: <strong>No</strong> · Limited public ready: <strong>No</strong></p>
        </article>)}
      </div>
    </section>

    <section className="section">
      <h2>Controlled supply groups</h2>
      <article className="card">
        <div className="form-grid">
          <label>Name<input value={groupName} onChange={(event) => setGroupName(event.target.value)} placeholder="Kano Ride drill supply" /></label>
          <label>City<select value={city} onChange={(event) => setCity(event.target.value)}><option>KANO</option><option>ABUJA</option></select></label>
          <label>Service<select value={serviceType} onChange={(event) => setServiceType(event.target.value as LaunchServiceType)}>{services.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label>Maximum members<input inputMode="numeric" value={maximumMembers} onChange={(event) => setMaximumMembers(event.target.value)} /></label>
          <label>Window starts<input type="datetime-local" value={startAt} onChange={(event) => setStartAt(event.target.value)} /></label>
          <label>Window ends<input type="datetime-local" value={endAt} onChange={(event) => setEndAt(event.target.value)} /></label>
        </div>
        <button disabled={!groupName.trim() || Number(maximumMembers) < 1 || Boolean(startAt && endAt && startAt >= endAt)} onClick={() => void action(() => productionLaunchApi.createControlledGroup({ name: groupName, city, serviceType, maximumMembers: Number(maximumMembers), ...(startAt ? { startAt } : {}), ...(endAt ? { endAt } : {}), internalNote: "Controlled production operations only; no credentials or private documents." }), "Controlled supply group created in DRAFT.")}>Create DRAFT group</button>
        <p className="muted">Disabled until a name and safe member limit are supplied. Activation remains an explicit audited owner action.</p>
      </article>
    </section>

    <section className="section">
      <h2>Controlled groups and members</h2>
      {groups.length ? groups.map((group) => <article className="card" key={group.id}>
        <h3>{group.name}</h3>
        <p><Badge>{group.status}</Badge> · {group.cityCode} · {label(group.serviceType)} · {group._count.members}/{group.maximumMembers}</p>
        <p className="muted">Window: {dateTime(group.startAt)} to {dateTime(group.endAt)} · {group.activeWindow ? "Within configured window" : "Outside configured window"}</p>
        <div className="actions">
          {group.status !== "ACTIVE" ? <button onClick={() => { const reason = window.prompt("Audited reason for activating this controlled group"); if (reason?.trim()) void action(() => productionLaunchApi.updateControlledGroup(group.id, { status: "ACTIVE", reason }), "Controlled group activated; no launch stage changed."); }}>Activate group</button> : null}
          {group.status !== "PAUSED" ? <button className="secondary" onClick={() => { const reason = window.prompt("Audited reason for pausing this group"); if (reason?.trim()) void action(() => productionLaunchApi.updateControlledGroup(group.id, { status: "PAUSED", reason }), "Controlled group paused."); }}>Pause group</button> : null}
        </div>
        {group.members.length ? <table className="table"><thead><tr><th>Type</th><th>Identity</th><th>State</th><th>Reason</th><th>Action</th></tr></thead><tbody>{group.members.map((member) => <tr key={member.id}><td>{label(member.memberType)}</td><td>{member.captainUserId ?? member.vendorId}</td><td><Badge>{member.enabled ? "ACTIVE" : "DISABLED"}</Badge></td><td>{member.reason ?? "Not recorded"}</td><td><button className="secondary" onClick={() => { const reason = window.prompt(`Audited reason to ${member.enabled ? "remove from active controlled supply" : "activate"} this member`); if (reason?.trim()) void action(() => productionLaunchApi.updateControlledMember(group.id, member.id, { enabled: !member.enabled, reason }), member.enabled ? "Controlled member removed from active supply and retained for audit." : "Controlled member activated after eligibility checks."); }}>{member.enabled ? "Remove / deactivate" : "Activate"}</button></td></tr>)}</tbody></table> : <Empty>No members. Add an existing approved Captain or Partner by ID.</Empty>}
      </article>) : <Empty>No controlled supply groups. Kano and Abuja remain NOT_READY — SUPPLY_REQUIRED.</Empty>}
    </section>

    <section className="section">
      <h2>Add existing Captain or Partner</h2>
      <article className="card"><div className="form-grid">
        <label>Controlled group<select value={groupId} onChange={(event) => setGroupId(event.target.value)}><option value="">Select group</option>{groups.map((group) => <option key={group.id} value={group.id}>{group.cityCode} · {group.serviceType} · {group.name}</option>)}</select></label>
        <label>Member type<select value={memberType} onChange={(event) => setMemberType(event.target.value as ControlledSupplyMemberType)}>{(["RIDE_CAPTAIN", "DELIVERY_CAPTAIN", "DUAL_MODE_CAPTAIN", "PRODUCT_SELLER", "SERVICE_PROVIDER", "MIXED_PARTNER"] as ControlledSupplyMemberType[]).map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>{captainType ? "Captain user UUID" : "Partner vendor UUID"}<input value={identityId} onChange={(event) => setIdentityId(event.target.value)} /></label>
      </div><button disabled={!groupId || !identityId.trim()} onClick={() => void action(() => productionLaunchApi.addControlledMember(groupId, { memberType, ...(captainType ? { captainUserId: identityId } : { vendorId: identityId }), reason: "Selected for scheduled controlled production operations" }), "Existing account added disabled; confirm eligibility before activation.")}>Add disabled member</button></article>
    </section>

    <section className="section">
      <h2>Controlled Operations Customers</h2>
      <p className="muted">Use separate reusable Kano and Abuja Operations accounts. Never enter credentials, OTPs, payment secrets, founder accounts, or private personal data.</p>
      <article className="card"><div className="form-grid"><label>Customer user UUID<input value={customerUserId} onChange={(event) => setCustomerUserId(event.target.value)} /></label><label>Safe label<input value={customerLabel} onChange={(event) => setCustomerLabel(event.target.value)} placeholder="Kano Operations Customer" /></label><label>City<select value={city} onChange={(event) => setCity(event.target.value)}><option>KANO</option><option>ABUJA</option></select></label></div><button disabled={!customerUserId || !customerLabel.trim()} onClick={() => void action(() => productionLaunchApi.addControlledCustomer({ city, userId: customerUserId, label: customerLabel, internalNote: "Credentials held privately by authorised owner." }), "Controlled Operations Customer added disabled and excluded from campaigns.")}>Add controlled Customer</button></article>
      {customers.length ? <table className="table"><thead><tr><th>City</th><th>Safe label</th><th>Campaigns</th><th>State</th><th>Action</th></tr></thead><tbody>{customers.map((customer) => <tr key={customer.id}><td>{customer.cityCode}</td><td>{customer.label}</td><td>{customer.excludedFromCampaigns ? "Excluded" : "Review required"}</td><td><Badge>{customer.enabled ? "ACTIVE" : "DISABLED"}</Badge></td><td><button className="secondary" onClick={() => { const reason = window.prompt(`Audited reason to ${customer.enabled ? "deactivate" : "activate"} this Operations Customer`); if (reason?.trim()) void action(() => productionLaunchApi.updateControlledCustomer(customer.id, { enabled: !customer.enabled, reason }), customer.enabled ? "Controlled Customer deactivated." : "Controlled Customer activated for Operations-only use."); }}>{customer.enabled ? "Deactivate" : "Activate"}</button></td></tr>)}</tbody></table> : <Empty>No controlled Operations Customers are registered.</Empty>}
    </section>

    <section className="section">
      <h2>Eligibility and live controlled supply</h2>
      <div className="actions"><button onClick={() => void loadEligibility()}>Load eligibility for {city} / {label(serviceType)}</button><button className="secondary" onClick={() => void reload()}>Manual Refresh monitor</button></div>
      <p className="muted">Refresh is manual to avoid aggressive polling, GPS loops, or background load.</p><ErrorMessage>{eligibilityError}</ErrorMessage>
      {captains.length ? <table className="table"><thead><tr><th>Captain</th><th>City / online</th><th>Modes / vehicle</th><th>GPS</th><th>Documents / group</th><th>Eligibility</th></tr></thead><tbody>{captains.map((captain) => <tr key={captain.userId}><td>{captain.captainName}<br /><span className="muted">{captain.captainCode}</span></td><td>{captain.city}<br /><Badge>{captain.onlineState}</Badge></td><td>{captain.rideStatus} / {captain.deliveryStatus}<br />{captain.vehicle || "Vehicle incomplete"}</td><td>{dateTime(captain.lastGpsUpdate)}</td><td>{captain.documentStatus}<br /><span className="muted">{captain.controlledGroup?.name ?? "No matching controlled group"}</span></td><td><Badge>{captain.eligibility}</Badge><br /><span className="muted">{captain.blockers.join(", ") || "ELIGIBLE"}</span></td></tr>)}</tbody></table> : <Empty>Load eligibility to view Captain blockers.</Empty>}
      {partners.length ? <table className="table"><thead><tr><th>Partner</th><th>City / online</th><th>Capability</th><th>Catalogue / orders</th><th>Documents / group</th><th>Eligibility</th></tr></thead><tbody>{partners.map((partner) => <tr key={partner.vendorId ?? partner.userId}><td>{partner.businessName}<br /><span className="muted">{partner.tradingName || "No trading name"}</span></td><td>{partner.city}<br /><Badge>{partner.onlineState}</Badge></td><td>{partner.capability}</td><td>{partner.activeProductCount ?? 0} products / {partner.activeServiceCount ?? 0} services<br />{partner.openOrderCount ?? 0} open orders</td><td>{partner.documentStatus}<br /><span className="muted">{partner.controlledGroup?.name ?? "No matching controlled group"}</span></td><td><Badge>{partner.eligibility}</Badge><br /><span className="muted">{partner.blockers.join(", ") || "ELIGIBLE"}</span></td></tr>)}</tbody></table> : <Empty>Load eligibility to view Partner blockers.</Empty>}
      <div className="grid">{monitor.map((item) => <article className="card" key={item.city.code}><h3>{item.city.name} monitor</h3><p>Captains — approved: <strong>{String(item.captains.approved ?? 0)}</strong> · controlled: <strong>{String(item.captains.controlled ?? 0)}</strong> · online: <strong>{String(item.captains.online ?? 0)}</strong> · available: <strong>{String(item.captains.available ?? 0)}</strong> · busy: <strong>{String(item.captains.busy ?? 0)}</strong> · offline: <strong>{String(item.captains.offline ?? 0)}</strong> · stale: <strong>{String(item.captains.locationStale ?? 0)}</strong> · suspended: <strong>{String(item.captains.suspended ?? 0)}</strong> · active Ride: <strong>{String(item.captains.activeRide ?? 0)}</strong> · active Delivery: <strong>{String(item.captains.activeDelivery ?? 0)}</strong></p><p>Partners — approved: <strong>{String(item.partners.approved ?? 0)}</strong> · controlled: <strong>{String(item.partners.controlled ?? 0)}</strong> · online: <strong>{String(item.partners.online ?? 0)}</strong> · offline: <strong>{String(item.partners.offline ?? 0)}</strong> · Product Seller: <strong>{String(item.partners.productSellers ?? 0)}</strong> · Service Provider: <strong>{String(item.partners.serviceProviders ?? 0)}</strong> · both: <strong>{String(item.partners.both ?? 0)}</strong> · active products: <strong>{String(item.partners.activeProducts ?? 0)}</strong> · active services: <strong>{String(item.partners.activeServices ?? 0)}</strong> · open orders: <strong>{String(item.partners.openOrders ?? 0)}</strong></p><p className="muted">Refreshed {dateTime(item.refreshedAt)}</p></article>)}</div>
    </section>

    <section className="section"><h2>Controlled activation audit history</h2>{audit.length ? <table className="table"><thead><tr><th>Time</th><th>Action</th><th>Entity</th></tr></thead><tbody>{audit.slice(0, 100).map((entry, index) => <tr key={String(entry.id ?? index)}><td>{dateTime(String(entry.createdAt ?? ""))}</td><td>{label(String(entry.action ?? "unknown"))}</td><td>{String(entry.entityType ?? "Unknown")} {String(entry.entityId ?? "")}</td></tr>)}</tbody></table> : <Empty>No controlled activation audit history yet.</Empty>}</section>
  </>;
}

function QuickCandidateSelector({ title, query, setQuery, candidates, selectedId, setSelectedId, loading, onSearch, onBrowse, onPage, pagination, diagnosticCode, identity }: {
  title: string;
  query: string;
  setQuery: (value: string) => void;
  candidates: QuickLaunchCandidate[];
  selectedId: string;
  setSelectedId: (value: string) => void;
  loading: boolean;
  onSearch: () => void;
  onBrowse: () => void;
  onPage: (page: number) => void;
  pagination: QuickLaunchDiscoveryPage["pagination"];
  diagnosticCode: QuickLaunchDiscoveryPage["diagnosticCode"];
  identity: (candidate: QuickLaunchCandidate) => string;
}) {
  const [readyOnly, setReadyOnly] = useState(false);
  const [capability, setCapability] = useState("ALL");
  const supportsCapability = title.includes("Captain") || title === "Partner" || title === "Service Provider";
  const visibleCandidates = candidates.filter((candidate) => (!readyOnly || candidate.ready)
    && (capability === "ALL" || String(candidate.capabilityLabel ?? "").toUpperCase().includes(capability)));
  const selected = visibleCandidates.find((candidate) => identity(candidate) === selectedId);
  const candidateName = (candidate: QuickLaunchCandidate) => candidate.businessName ?? candidate.tradingName ?? candidate.fullName ?? candidate.name ?? candidate.captainName ?? "Unnamed account";
  const candidateCode = (candidate: QuickLaunchCandidate) => candidate.customerCode ?? candidate.captainCode ?? candidate.partnerCode ?? "No KariGO code";
  return <article className="card quick-selector">
    <h3>{title}</h3>
    <button className="secondary" disabled={loading} onClick={onBrowse}>Browse / Select account</button>
    <div className="actions"><input aria-label={`Search ${title}`} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, phone or reference" /><button className="secondary" disabled={loading} onClick={onSearch}>{loading ? "Loading..." : "Search"}</button></div>
    <div className="actions"><label>Readiness<select value={readyOnly ? "READY" : "ALL"} onChange={(event) => setReadyOnly(event.target.value === "READY")}><option value="ALL">All</option><option value="READY">READY only</option></select></label>{supportsCapability ? <label>Capability<select value={capability} onChange={(event) => setCapability(event.target.value)}><option value="ALL">All capabilities</option><option value="RIDE">Ride</option><option value="DELIVERY">Delivery</option><option value="PRODUCT">Product Seller</option><option value="SERVICE">Service Provider</option></select></label> : null}</div>
    {visibleCandidates.length ? <label>Select account<select value={selectedId} onChange={(event) => setSelectedId(event.target.value)}><option value="">Select a {title}</option>{visibleCandidates.map((candidate) => <option key={identity(candidate)} value={identity(candidate)}>{candidateName(candidate)} · {candidate.phoneNumber} · {candidateCode(candidate)} · {candidate.ready ? "READY" : candidate.blockerMessages.join("; ")}</option>)}</select></label> : !loading && diagnosticCode === "IDENTITY_NOT_FOUND" ? <p className="empty">No matching KariGO account found. Check the name or phone number.</p> : !loading ? <p className="empty">{diagnosticCode ? label(diagnosticCode) : "No accounts match the selected filters."}</p> : null}
    {selected ? <div className={selected.ready ? "quick-ready" : "quick-blocked"}><p><Badge>{selected.ready ? "READY" : "BLOCKED"}</Badge> <strong>{candidateName(selected)}</strong></p><p>{selected.phoneNumber} · {candidateCode(selected)}{selected.email ? ` · ${selected.email}` : ""}</p><p>{selected.capabilityLabel ?? title} · {selected.statusLabel ?? (selected.ready ? "Operational access ready" : "Not ready")}</p>{selected.cityReadiness ? <p>{selected.cityReadiness}</p> : <p>City: {selected.city}</p>}{selected.approvedCities?.length ? <p>Approved cities: {selected.approvedCities.join(", ")} · Ride app: {selected.rideApplicationStatus} · Delivery app: {selected.deliveryApplicationStatus} · Vehicle: {selected.vehicleReadiness} · Documents: {selected.documentReadiness} · GPS: {dateTime(selected.lastGpsUpdate)} · {selected.onlineState} · Assignment: {selected.activeAssignment ? "ACTIVE" : "CLEAR"}</p> : null}{selected.lifecycleStatus ? <p>Lifecycle: {label(selected.lifecycleStatus)} · Active products: {selected.activeProductCount ?? 0} · Active services: {selected.activeServiceCount ?? 0} · Open work: {selected.openOrderCount ?? 0} · Documents: {selected.documentReadiness}</p> : null}{selected.blockerMessages.map((blocker) => <p key={blocker}>{blocker}</p>)}<small className="muted">Technical ID: {identity(selected)}</small></div> : candidates.length ? <p className="muted">Search and select an existing account. Internal IDs are shown only as secondary technical information.</p> : null}
    {pagination.total ? <div className="actions"><button className="secondary" disabled={loading || pagination.page <= 1} onClick={() => onPage(pagination.page - 1)}>Previous</button><span>Page {pagination.page} · {pagination.total} account(s)</span><button className="secondary" disabled={loading || !pagination.hasMore} onClick={() => onPage(pagination.page + 1)}>Next</button></div> : null}
  </article>;
}

function QuickLaunchView({ reload }: { reload: () => Promise<void> }) {
  const [city, setCity] = useState("KANO");
  const [serviceType, setServiceType] = useState<LaunchServiceType>("RIDES");
  const [context, setContext] = useState<QuickLaunchContext | null>(null);
  const emptyDiscovery: QuickLaunchDiscoveryPage = { items: [], pagination: { page: 1, pageSize: 50, total: 0, hasMore: false }, diagnosticCode: null };
  const [customerDiscovery, setCustomerDiscovery] = useState<QuickLaunchDiscoveryPage>(emptyDiscovery);
  const [captainDiscovery, setCaptainDiscovery] = useState<QuickLaunchDiscoveryPage>(emptyDiscovery);
  const [partnerDiscovery, setPartnerDiscovery] = useState<QuickLaunchDiscoveryPage>(emptyDiscovery);
  const [diagnostics, setDiagnostics] = useState<QuickLaunchIdentityDiagnostics | null>(null);
  const customers = customerDiscovery.items; const captains = captainDiscovery.items; const partners = partnerDiscovery.items;
  const [customerQuery, setCustomerQuery] = useState("");
  const [captainQuery, setCaptainQuery] = useState("");
  const [partnerQuery, setPartnerQuery] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [captainId, setCaptainId] = useState("");
  const [partnerId, setPartnerId] = useState("");
  const [reason, setReason] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [session, setSession] = useState<QuickLaunchSession | null>(null);
  const [returnAfterPass, setReturnAfterPass] = useState(true);
  const [stopReason, setStopReason] = useState("");

  const requirements = context?.requirements ?? { customer: true as const, captain: serviceType !== "SME_SERVICES", partner: serviceType !== "RIDES" };
  const selectedCustomer = customers.find((item) => item.userId === customerId);
  const selectedCaptain = captains.find((item) => item.userId === captainId);
  const selectedPartner = partners.find((item) => item.vendorId === partnerId);
  const selectionsReady = Boolean(selectedCustomer?.ready && (!requirements.captain || selectedCaptain?.ready) && (!requirements.partner || selectedPartner?.ready));

  const loadCandidates = useCallback(async (queries?: { customer?: string; captain?: string; partner?: string }, pages?: { customer?: number; captain?: number; partner?: number }) => {
    setLoadingCandidates(true);
    setError("");
    try {
      const nextContext = await productionLaunchApi.quickLaunchContext(city, serviceType);
      const [nextCustomers, nextCaptains, nextPartners] = await Promise.all([
        productionLaunchApi.quickLaunchCustomers(city, queries?.customer ?? customerQuery, "ALL", pages?.customer ?? 1),
        nextContext.requirements.captain ? productionLaunchApi.quickLaunchCaptains(city, serviceType, queries?.captain ?? captainQuery, "ALL", "ALL", pages?.captain ?? 1) : Promise.resolve(emptyDiscovery),
        nextContext.requirements.partner ? productionLaunchApi.quickLaunchPartners(city, serviceType, queries?.partner ?? partnerQuery, "ALL", "ALL", pages?.partner ?? 1) : Promise.resolve(emptyDiscovery)
      ]);
      setContext(nextContext); setCustomerDiscovery(nextCustomers); setCaptainDiscovery(nextCaptains); setPartnerDiscovery(nextPartners);
    } catch (cause) { setError(friendlyError(cause, "form")); }
    finally { setLoadingCandidates(false); }
  }, [city, serviceType, customerQuery, captainQuery, partnerQuery]);

  useEffect(() => {
    setCustomerId(""); setCaptainId(""); setPartnerId(""); setReviewing(false); setConfirmed(false); setSession(null);
    void loadCandidates({ customer: "", captain: "", partner: "" });
  }, [city, serviceType]);

  useEffect(() => {
    void productionLaunchApi.quickLaunchDiagnostics().then(setDiagnostics).catch(() => setDiagnostics(null));
  }, []);

  async function start() {
    if (saving) return;
    setSaving(true); setError(""); setSuccess("");
    try {
      const next = await productionLaunchApi.startQuickLaunch({ city, serviceType, customerUserId: customerId, captainUserId: requirements.captain ? captainId : undefined, partnerVendorId: requirements.partner ? partnerId : undefined, reason, confirmed });
      setSession(next); setReviewing(false); setConfirmed(false); setSuccess(`${label(serviceType)} is OPERATIONS ONLY in ${label(city)}. Guided controlled test started.`);
      await reload();
    } catch (cause) { setError(friendlyError(cause, "form")); }
    finally { setSaving(false); }
  }

  async function updateStep(stepId: string, status: "PASSED" | "FAILED") {
    if (!session || saving) return;
    setSaving(true); setError(""); setSuccess("");
    try {
      const note = status === "PASSED" ? "Operations confirmed guided Quick Launch evidence" : window.prompt("Describe the failure without entering secrets, PINs or private URLs")?.trim();
      if (status === "FAILED" && !note) return;
      const updated = await productionLaunchApi.updateDrillStep(session.drill.id, stepId, { status, note });
      setSession({ ...session, drill: { ...session.drill, steps: session.drill.steps.map((step) => step.id === stepId ? { ...step, ...(updated as object) } : step) } });
      setSuccess(`Guided test step marked ${status.toLowerCase()}.`);
    } catch (cause) { setError(friendlyError(cause, "form")); }
    finally { setSaving(false); }
  }

  async function finish(outcome: "PASSED" | "FAILED" | "STOPPED") {
    if (!session || saving) return;
    const finishReason = outcome === "PASSED" ? `Quick Launch ${label(serviceType)} controlled test passed` : stopReason.trim();
    if (!finishReason) { setError("Enter a failure or stop reason before returning the service OFF."); return; }
    setSaving(true); setError(""); setSuccess("");
    try {
      const result = await productionLaunchApi.finishQuickLaunch(session.drill.id, { outcome, returnServiceOff: outcome === "PASSED" ? returnAfterPass : true, reason: finishReason, confirmed: true });
      setSession({ ...session, drill: result.drill, config: result.config ?? session.config });
      setSuccess(result.serviceReturnedOff ? "Test saved. The selected city/service is OFF; active transactions were preserved." : "Test passed. The selected city/service remains OPERATIONS ONLY for another controlled test.");
      await reload();
    } catch (cause) { setError(friendlyError(cause, "form")); }
    finally { setSaving(false); }
  }

  if (session) {
    const finished = ["PASSED", "FAILED", "BLOCKED"].includes(session.drill.result);
    const allPassed = session.drill.steps.every((step) => step.status === "PASSED");
    return <section className="section quick-launch"><h2>Quick Launch guided test</h2><p><Badge>{session.drill.result}</Badge> {session.city.name} · {label(session.serviceType)}</p>{success ? <p className="success">{success}</p> : null}<ErrorMessage>{error}</ErrorMessage>
      <div className="quick-steps">{session.drill.steps.map((step) => <article className="card" key={step.id}><p><strong>{step.position}. {step.label}</strong></p><p><Badge>{step.status}</Badge></p>{!finished ? <div className="actions"><button disabled={saving || step.status === "PASSED"} onClick={() => void updateStep(step.id, "PASSED")}>Check / Pass</button><button className="secondary" disabled={saving} onClick={() => void updateStep(step.id, "FAILED")}>Record blocker</button></div> : null}</article>)}</div>
      {!finished ? <article className="card finish-controls"><h3>Finish controlled test</h3><label className="check-row"><input type="radio" checked={returnAfterPass} onChange={() => setReturnAfterPass(true)} />After passing, return this service OFF</label><label className="check-row"><input type="radio" checked={!returnAfterPass} onChange={() => setReturnAfterPass(false)} />After passing, keep OPERATIONS ONLY for another test</label><div className="actions"><button disabled={saving || !allPassed} onClick={() => void finish("PASSED")}>Pass Test</button></div><p className="muted">Every guided step must pass before the test can be passed.</p><label>Failure / stop reason<textarea value={stopReason} onChange={(event) => setStopReason(event.target.value)} placeholder="Record why the controlled test stopped. Do not enter secrets." /></label><button className="secondary" disabled={saving || !stopReason.trim()} onClick={() => void finish("STOPPED")}>Stop Test / Return Service OFF</button><p className="muted">Returning OFF blocks new demand and preserves any active transaction safely. Controlled records and audit history are retained.</p></article> : null}
    </section>;
  }

  return <section className="section quick-launch"><h2>Quick Launch</h2><p>Start one controlled Kano or Abuja production test without copying account UUIDs or creating technical supply records.</p><p className="muted">Quick Launch can only select OPERATIONS ONLY. It cannot activate Invite Only, Limited Public or City Wide, initiate automatic matching, or enable payouts.</p>
    <div className="form-grid"><label>City<select value={city} onChange={(event) => setCity(event.target.value)}><option value="KANO">Kano</option><option value="ABUJA">Abuja</option></select></label><label>Service<select value={serviceType} onChange={(event) => setServiceType(event.target.value as LaunchServiceType)}>{services.map((service) => <option key={service} value={service}>{label(service)}</option>)}</select></label></div>
    {context && !context.stageSafeForQuickLaunch ? <div className="quick-blocked"><strong>Advanced stage must return OFF</strong><p>This service is currently {label(context.currentStage)}. Return it to OFF in Command before using Quick Launch.</p></div> : context && !context.manualChecklistReady ? <div className="quick-blocked"><strong>Manual safety checks still required</strong><p>Open the Checklist tab and complete: {context.manualChecklistBlockers.join(", ") || `${context.criticalFailures} critical drill blocker(s)`}.</p></div> : <div className="quick-ready"><strong>Manual safety checks ready</strong><p>Quick Launch will verify and audit the controlled account, group and 1/1 capacity checks.</p></div>}
    <div className="grid quick-grid"><QuickCandidateSelector title="Controlled Customer" query={customerQuery} setQuery={setCustomerQuery} candidates={customers} selectedId={customerId} setSelectedId={setCustomerId} loading={loadingCandidates} onSearch={() => void loadCandidates({ customer: customerQuery })} onBrowse={() => { setCustomerQuery(""); void loadCandidates({ customer: "" }); }} onPage={(page) => void loadCandidates(undefined, { customer: page })} pagination={customerDiscovery.pagination} diagnosticCode={customerDiscovery.diagnosticCode} identity={(candidate) => candidate.userId} />
      {requirements.captain ? <QuickCandidateSelector title={serviceType === "RIDES" ? "Ride Captain" : "Delivery Captain"} query={captainQuery} setQuery={setCaptainQuery} candidates={captains} selectedId={captainId} setSelectedId={setCaptainId} loading={loadingCandidates} onSearch={() => void loadCandidates({ captain: captainQuery })} onBrowse={() => { setCaptainQuery(""); void loadCandidates({ captain: "" }); }} onPage={(page) => void loadCandidates(undefined, { captain: page })} pagination={captainDiscovery.pagination} diagnosticCode={captainDiscovery.diagnosticCode} identity={(candidate) => candidate.userId} /> : null}
      {requirements.partner ? <QuickCandidateSelector title={serviceType === "SME_SERVICES" ? "Service Provider" : "Partner"} query={partnerQuery} setQuery={setPartnerQuery} candidates={partners} selectedId={partnerId} setSelectedId={setPartnerId} loading={loadingCandidates} onSearch={() => void loadCandidates({ partner: partnerQuery })} onBrowse={() => { setPartnerQuery(""); void loadCandidates({ partner: "" }); }} onPage={(page) => void loadCandidates(undefined, { partner: page })} pagination={partnerDiscovery.pagination} diagnosticCode={partnerDiscovery.diagnosticCode} identity={(candidate) => candidate.vendorId ?? ""} /> : null}</div>
    {diagnostics ? <article className="card internal"><h3>Quick Launch Identity Diagnostics</h3><p className="muted">Admin-only, read-only counts from the same authoritative account sources. No passwords, tokens, OTPs or private document URLs are included.</p><p>Customers visible in Admin source: <strong>{diagnostics.counts.customersVisible}</strong> · Ride Captains: <strong>{diagnostics.counts.rideCaptainsVisible}</strong> · Delivery Captains: <strong>{diagnostics.counts.deliveryCaptainsVisible}</strong> · Partners: <strong>{diagnostics.counts.partnersVisible}</strong></p><p>Missing expected links: <strong>{diagnostics.counts.identitiesMissingExpectedProfileLinks}</strong> · Customer profiles: <strong>{diagnostics.counts.customerProfilesMissing}</strong> · Approved Captain applications missing User: <strong>{diagnostics.counts.approvedCaptainApplicationsMissingUser}</strong> · Profiles missing User: <strong>{diagnostics.counts.profilesMissingUser}</strong> · Vendors missing User: <strong>{diagnostics.counts.vendorsMissingUser}</strong></p></article> : null}
    <article className="card"><label>Required operational reason<textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Example: Owner-approved first Kano Ride controlled transaction" /></label><button disabled={!selectionsReady || !context?.manualChecklistReady || !context.stageSafeForQuickLaunch || !reason.trim()} onClick={() => setReviewing(true)}>Review controlled test</button></article>
    {reviewing ? <article className="card confirmation"><h3>Confirm Quick Launch changes</h3><p>Only <strong>{label(city)} / {label(serviceType)}</strong> will change.</p><ul><li>Create or reuse one controlled supply group.</li><li>Enable only the selected controlled participants.</li><li>Set maximum concurrent and unassigned requests to 1.</li><li>Preserve configured operating hours.</li><li>Set the selected service to OPERATIONS ONLY and create its guided drill.</li><li>Leave every other city/service unchanged.</li></ul><label className="check-row"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />I confirm this controlled production change and reason.</label><ErrorMessage>{error}</ErrorMessage>{success ? <p className="success">{success}</p> : null}<div className="actions"><button disabled={saving || !confirmed} onClick={() => void start()}>{saving ? "Starting..." : "Start Controlled Test"}</button><button className="secondary" disabled={saving} onClick={() => { setReviewing(false); setConfirmed(false); }}>Back</button></div></article> : <ErrorMessage>{error}</ErrorMessage>}
    <article className="card internal"><h3>Accelerate utilities</h3><p><strong>Provider network access configured — production transaction verification pending.</strong></p><p className="muted">Airtime, Data, Electricity and Cable TV live vending/reconciliation are tested separately and do not block initial Ride, Delivery, Partner or SME controlled launch.</p></article>
  </section>;
}

function OperationsChecklistView({ action }: { action: (fn: () => Promise<unknown>, message: string) => Promise<void> }) {
  const [city, setCity] = useState("KANO");
  const [serviceType, setServiceType] = useState<LaunchServiceType>("RIDES");
  const [checklist, setChecklist] = useState<OperationsChecklist | null>(null);
  const [error, setError] = useState("");
  async function loadChecklist() { try { setChecklist(await productionLaunchApi.operationsChecklist(city, serviceType)); setError(""); } catch (cause) { setError(friendlyError(cause, "form")); } }
  useEffect(() => { void loadChecklist(); }, [city, serviceType]);
  return <section className="section"><h2>Operations-only activation checklist</h2><p className="muted">The Apply audited change button remains backend-blocked until every mandatory item is complete or validly waived. No checklist action promotes a launch stage.</p><div className="actions"><select value={city} onChange={(event) => setCity(event.target.value)}><option>KANO</option><option>ABUJA</option></select><select value={serviceType} onChange={(event) => setServiceType(event.target.value as LaunchServiceType)}>{services.map((item) => <option key={item}>{item}</option>)}</select><button className="secondary" onClick={() => void loadChecklist()}>Refresh checklist</button></div><ErrorMessage>{error}</ErrorMessage>
    {checklist ? <><p><Badge>{checklist.canEnableOperationsOnly ? "CHECKLIST_COMPLETE" : "OPERATIONS_ONLY_DISABLED"}</Badge> {checklist.score.satisfied}/{checklist.score.total} satisfied · Critical blockers: {checklist.criticalFailures}</p><table className="table"><thead><tr><th>Mandatory check</th><th>Status</th><th>Note / waiver</th><th>Action</th></tr></thead><tbody>{checklist.items.map((item) => <tr key={item.id}><td>{item.label}</td><td><Badge>{item.status}</Badge></td><td>{item.waiverReason ?? item.note ?? "Evidence required"}</td><td><select value={item.status} onChange={(event) => { const status = event.target.value; let waiverReason: string | undefined; let waiverExpiresAt: string | undefined; if (status === "WAIVED") { waiverReason = window.prompt("Required waiver reason") ?? undefined; waiverExpiresAt = window.prompt("Required waiver expiry (YYYY-MM-DD)") ?? undefined; if (!waiverReason?.trim() || !waiverExpiresAt?.trim()) return; } void action(() => productionLaunchApi.updateOperationsChecklist(city, serviceType, item.id, { status, note: status === "COMPLETE" ? "Owner-confirmed operational evidence recorded" : undefined, waiverReason, waiverExpiresAt }), "Operations checklist item updated and audited.").then(loadChecklist); }}><option>NOT_READY</option><option>COMPLETE</option><option>WAIVED</option></select></td></tr>)}</tbody></table></> : <Loading />}
  </section>;
}

function SupplyView({ command }: { command: LaunchCommandCentre }) {
  return <>{command.cities.map((city) => <section className="section" key={city.city.code}>
    <h2>{city.city.name} supply</h2>
    <p className="muted">Operational counts are Admin-only. Customer availability responses never expose these values.</p>
    {city.supply ? <div className="grid">
      {Object.entries(city.supply.captains.ride).map(([key, value]) => <article className="card" key={`ride-${key}`}><span className="muted">Ride Captain: {label(key)}</span><p className="metric">{value}</p></article>)}
      {Object.entries(city.supply.captains.delivery).map(([key, value]) => <article className="card" key={`delivery-${key}`}><span className="muted">Delivery Captain: {label(key)}</span><p className="metric">{value}</p></article>)}
      {Object.entries(city.supply.partners).map(([key, value]) => <article className="card" key={`partner-${key}`}><span className="muted">Partner: {label(key)}</span><p className="metric">{value}</p></article>)}
    </div> : <Empty>Supply data is temporarily unavailable for this city.</Empty>}
  </section>)}</>;
}

function ReadinessRow({ city, item, onSave }: { city: string; item: LaunchReadiness["items"][number]; onSave: (payload: Record<string, unknown>) => Promise<void> }) {
  const [status, setStatus] = useState(item.status);
  const [note, setNote] = useState(item.note ?? "");
  const [waiverReason, setWaiverReason] = useState(item.waiverReason ?? "");
  const [waiverExpiresAt, setWaiverExpiresAt] = useState(item.waiverExpiresAt?.slice(0, 10) ?? "");
  return <tr><td><strong>{item.label}</strong><br /><span className="muted">{city}</span></td><td><select value={status} onChange={(event) => setStatus(event.target.value as ReadinessStatus)}>{readinessStatuses.map((value) => <option key={value}>{value}</option>)}</select></td><td><input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Operational evidence or note" />{status === "WAIVED" ? <><input value={waiverReason} onChange={(event) => setWaiverReason(event.target.value)} placeholder="Required waiver reason" /><input type="date" value={waiverExpiresAt} onChange={(event) => setWaiverExpiresAt(event.target.value)} /></> : null}</td><td><button onClick={() => void onSave({ status, note, waiverReason: status === "WAIVED" ? waiverReason : undefined, waiverExpiresAt: status === "WAIVED" ? new Date(`${waiverExpiresAt}T23:59:59.000Z`).toISOString() : undefined })}>Save</button></td></tr>;
}

function CohortsView({ cohorts, action }: { cohorts: LaunchCohort[]; action: (fn: () => Promise<unknown>, message: string) => Promise<void> }) {
  const [name, setName] = useState(""); const [city, setCity] = useState("KANO"); const [maximum, setMaximum] = useState("50"); const [memberIds, setMemberIds] = useState<Record<string, string>>({});
  return <section className="section"><h2>Customer cohorts</h2><article className="card"><h3>Create private invite cohort</h3><div className="form-grid"><label>Name<input value={name} onChange={(event) => setName(event.target.value)} /></label><label>City<select value={city} onChange={(event) => setCity(event.target.value)}><option>KANO</option><option>ABUJA</option></select></label><label>Maximum Customers<input value={maximum} onChange={(event) => setMaximum(event.target.value)} inputMode="numeric" /></label></div><button onClick={() => void action(() => productionLaunchApi.createCohort({ name, city, maximumCustomers: Number(maximum), status: "DRAFT" }), "Cohort created in DRAFT state.")}>Create cohort</button></article>
    {cohorts.length ? cohorts.map((cohort) => <article className="card" key={cohort.id}><h3>{cohort.name}</h3><p><Badge>{cohort.status}</Badge> {cohort.cityCode} - {cohort.members.length}/{cohort.maximumCustomers} members</p><div className="actions"><button className="secondary" onClick={() => void action(() => productionLaunchApi.updateCohort(cohort.id, { status: cohort.status === "PAUSED" ? "ACTIVE" : "PAUSED", reason: "Admin launch-control update" }), "Cohort status updated.")}>{cohort.status === "PAUSED" ? "Resume cohort" : "Pause cohort"}</button></div><label>Customer user UUIDs (comma or new line separated)<textarea value={memberIds[cohort.id] ?? ""} onChange={(event) => setMemberIds((value) => ({ ...value, [cohort.id]: event.target.value }))} placeholder="No phone numbers or emails. Use existing Customer UUIDs only." /></label><button onClick={() => void action(() => productionLaunchApi.addCohortMembers(cohort.id, (memberIds[cohort.id] ?? "").split(/[\s,]+/).filter(Boolean)), "Cohort members added.")}>Add verified Customers</button></article>) : <Empty>No launch cohorts have been created.</Empty>}
  </section>;
}

function IncidentsView({ incidents, action }: { incidents: LaunchIncident[]; action: (fn: () => Promise<unknown>, message: string) => Promise<void> }) {
  const [city, setCity] = useState("KANO"); const [severity, setSeverity] = useState("SEV3"); const [serviceType, setServiceType] = useState<LaunchServiceType>("RIDES"); const [summary, setSummary] = useState("");
  return <section className="section"><h2>Launch incidents</h2><article className="card"><div className="form-grid"><label>City<select value={city} onChange={(event) => setCity(event.target.value)}><option>KANO</option><option>ABUJA</option></select></label><label>Severity<select value={severity} onChange={(event) => setSeverity(event.target.value)}>{["SEV1", "SEV2", "SEV3", "SEV4"].map((item) => <option key={item}>{item}</option>)}</select></label><label>Service<select value={serviceType} onChange={(event) => setServiceType(event.target.value as LaunchServiceType)}>{services.map((item) => <option key={item}>{item}</option>)}</select></label><label>Summary<input value={summary} onChange={(event) => setSummary(event.target.value)} /></label></div><button onClick={() => void action(() => productionLaunchApi.createIncident({ city, severity, serviceType, summary }), "Incident created.")}>Open incident</button></article>
    {incidents.length ? incidents.map((incident) => <article className="card" key={incident.id}><h3>{incident.reference}</h3><p><Badge>{incident.severity}</Badge> <Badge>{incident.status}</Badge> {incident.cityCode} / {incident.serviceType ? label(incident.serviceType) : "Multiple services"}</p><p>{incident.summary}</p><div className="actions">{incident.status !== "CLOSED" ? <button className="secondary" onClick={() => void action(() => productionLaunchApi.updateIncident(incident.id, { status: "CLOSED", resolution: "Closed by Operations after review", timelineNote: "Incident closed from Production Launch" }), "Incident closed. No service was resumed automatically.")}>Close incident</button> : null}{incident.serviceType ? <button onClick={() => void action(() => productionLaunchApi.pauseFromIncident(incident.id, `Operational pause for ${incident.reference}`), "Affected service paused. Existing active work remains manageable.")}>Pause affected service</button> : null}</div></article>) : <Empty>No launch incidents recorded.</Empty>}
  </section>;
}

function DrillsView({ drills, groups, customers, action }: { drills: LaunchDrill[]; groups: ControlledSupplyGroup[]; customers: ControlledOperationsCustomer[]; action: (fn: () => Promise<unknown>, message: string) => Promise<void> }) {
  const [city, setCity] = useState("KANO");
  const [drillType, setDrillType] = useState(drillTypes[0]);
  const [serviceType, setServiceType] = useState<LaunchServiceType>("RIDES");
  const [reference, setReference] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [groupId, setGroupId] = useState("");
  const [captainUserId, setCaptainUserId] = useState("");
  const [partnerUserId, setPartnerUserId] = useState("");
  const selectedGroups = groups.filter((group) => group.cityCode === city && group.serviceType === serviceType);
  const selectedCustomers = customers.filter((customer) => customer.cityCode === city && customer.enabled);

  return <section className="section"><h2>Controlled transaction drills</h2><p className="muted">Creating or updating a drill records an audited checklist only. It never initiates a Ride, order, payment, assignment, payout, or stage change.</p><article className="card"><h3>Drill console</h3><div className="form-grid">
    <label>City<select value={city} onChange={(event) => { setCity(event.target.value); setCustomerId(""); setGroupId(""); }}><option>KANO</option><option>ABUJA</option></select></label>
    <label>Drill type<select value={drillType} onChange={(event) => setDrillType(event.target.value)}>{drillTypes.map((item) => <option key={item}>{item}</option>)}</select></label>
    <label>Service<select value={serviceType} onChange={(event) => { setServiceType(event.target.value as LaunchServiceType); setGroupId(""); }}>{services.map((item) => <option key={item}>{item}</option>)}</select></label>
    <label>Controlled Customer<select value={customerId} onChange={(event) => setCustomerId(event.target.value)}><option value="">Select enabled Customer</option>{selectedCustomers.map((customer) => <option key={customer.id} value={customer.id}>{customer.label}</option>)}</select></label>
    <label>Controlled supply group<select value={groupId} onChange={(event) => setGroupId(event.target.value)}><option value="">Select matching group</option>{selectedGroups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label>
    <label>Captain user UUID<input value={captainUserId} onChange={(event) => setCaptainUserId(event.target.value)} /></label>
    <label>Partner user UUID<input value={partnerUserId} onChange={(event) => setPartnerUserId(event.target.value)} /></label>
    <label>Ride / order / service reference<input value={reference} onChange={(event) => setReference(event.target.value)} /></label>
  </div><button disabled={!customerId || !groupId} onClick={() => void action(() => productionLaunchApi.createDrill({ city, drillType, serviceType, controlledCustomerId: customerId, controlledSupplyGroupId: groupId, captainUserId: captainUserId || undefined, partnerUserId: partnerUserId || undefined, relatedReference: reference || undefined }), "Controlled drill created with predefined checklist. No real transaction was initiated.")}>Create controlled drill</button><p className="muted">Disabled until an enabled city Customer and matching controlled supply group are selected.</p></article>
    {drills.length ? drills.map((drill) => <article className="card" key={drill.id}><h3>{drill.cityCode} · {label(drill.drillType)}</h3><p><Badge>{drill.result}</Badge> · {drill.serviceType ? label(drill.serviceType) : "Service not selected"} · Reference: {drill.relatedReference ?? "Not linked"}</p><p>Incident: {drill.incidentId ?? "None"} · Support: {drill.supportTicketId ?? "None"} · Critical blocker: {drill.criticalFailure ? "Yes" : "No"}</p>
      <div className="actions"><button onClick={() => void action(() => productionLaunchApi.updateDrill(drill.id, { result: "IN_PROGRESS", notes: "Owner started scheduled controlled drill" }), "Drill started and audited.")}>Start drill</button><button className="secondary" onClick={() => { const evidenceReference = window.prompt("Non-secret evidence reference required"); if (evidenceReference?.trim()) void action(() => productionLaunchApi.updateDrill(drill.id, { result: "PASSED", notes: "Operations evidence reviewed", evidenceReference }), "Drill marked passed and audited."); }}>Complete passed</button><button className="secondary" onClick={() => { const failureStage = window.prompt("Failure stage"); if (failureStage?.trim()) void action(() => productionLaunchApi.updateDrill(drill.id, { result: "FAILED", failureStage, notes: "Controlled drill stopped safely", criticalFailure: false }), "Drill marked failed and audited."); }}>Record failure</button>{["FAILED", "BLOCKED"].includes(drill.result) ? <button className="secondary" onClick={() => { const reason = window.prompt("Reason for reopening this incomplete drill"); if (reason?.trim()) void action(() => productionLaunchApi.reopenDrill(drill.id, reason), "Drill reopened and audited."); }}>Reopen incomplete drill</button> : null}</div>
      {drill.steps?.length ? <table className="table"><thead><tr><th>Step</th><th>Status</th><th>Safe note</th><th>Action</th></tr></thead><tbody>{drill.steps.map((step) => <tr key={step.id}><td>{step.position}. {step.label}</td><td><Badge>{step.status}</Badge></td><td>{step.note ?? "Not recorded"}</td><td><div className="actions"><button className="secondary" onClick={() => void action(() => productionLaunchApi.updateDrillStep(drill.id, step.id, { status: "PASSED", note: "Owner-confirmed evidence" }), "Drill step passed and audited.")}>Pass</button><button className="secondary" onClick={() => { const note = window.prompt("Safe failure note; do not enter secrets, PINs or private URLs"); if (note?.trim()) void action(() => productionLaunchApi.updateDrillStep(drill.id, step.id, { status: "FAILED", note }), "Drill step failed and audited."); }}>Fail</button></div></td></tr>)}</tbody></table> : <Empty>No predefined steps loaded.</Empty>}
      {["FAILED", "BLOCKED"].includes(drill.result) ? <div className="actions"><button className="secondary" onClick={() => { const summary = window.prompt("Safe failure summary"); if (!summary?.trim()) return; const actionType = window.prompt("Follow-up: INCIDENT, SUPPORT, BOTH or NEITHER", "INCIDENT"); if (!["INCIDENT", "SUPPORT", "BOTH", "NEITHER"].includes(actionType ?? "")) return; const criticalFailure = window.confirm("Is this a critical readiness-blocking failure?"); void action(() => productionLaunchApi.drillFailureFollowUp(drill.id, { action: actionType, summary, criticalFailure, severity: criticalFailure ? "SEV1" : "SEV2" }), "Drill failure follow-up linked and audited."); }}>Create incident / Create support / Create both / Record neither</button></div> : null}
      {drill.events?.length ? <details><summary>Audit history ({drill.events.length})</summary>{drill.events.map((event) => <p key={event.id}><strong>{label(event.eventType)}</strong> · {dateTime(event.createdAt)} · {event.note ?? "No note"}</p>)}</details> : null}
    </article>) : <Empty>No controlled drill records.</Empty>}
  </section>;
}

function SupportView({ support }: { support: LaunchSupportQueue | null }) {
  if (!support) return <Empty>Launch support queue could not be loaded.</Empty>;
  return <section className="section"><h2>Launch support queue</h2><div className="grid">{Object.entries(support.metrics).map(([key, value]) => <article className="card" key={key}><span className="muted">{label(key)}</span><p className="metric">{value}</p></article>)}</div>{support.items.length ? <table className="table"><thead><tr><th>Ticket</th><th>Subject</th><th>Priority</th><th>Status</th><th>Opened</th></tr></thead><tbody>{support.items.map((item) => <tr key={item.id}><td>{item.ticketNumber}</td><td>{item.subject}</td><td><Badge>{item.priority}</Badge></td><td><Badge>{item.status}</Badge></td><td>{dateTime(item.createdAt)}</td></tr>)}</tbody></table> : <Empty>No open launch support cases.</Empty>}</section>;
}

function ReportsView({ report }: { report: DailyLaunchReport | null }) {
  if (!report) return <Empty>Daily launch report could not be generated.</Empty>;
  return <section className="section"><h2>Daily launch report: {report.date}</h2><p className="muted">{report.privacy}</p><a className="button-link" href="/api/bff/admin/production-launch/reports/daily.csv">Export privacy-safe CSV</a><div className="grid">{report.cities.map((city) => <article className="card" key={String(city.city)}><h3>{String(city.city)}</h3>{Object.entries(city).filter(([key]) => !["city", "supply", "launchStages"].includes(key)).map(([key, value]) => <div className="item" key={key}><span>{label(key)}</span><strong>{typeof value === "object" ? "See source data" : String(value)}</strong></div>)}</article>)}</div></section>;
}

function HistoryView({ history }: { history: LaunchHistoryItem[] }) {
  return <section className="section"><h2>Configuration history</h2>{history.length ? <table className="table"><thead><tr><th>City/service</th><th>Previous</th><th>New</th><th>Reason</th><th>Admin</th><th>Time</th></tr></thead><tbody>{history.map((item) => <tr key={item.id}><td>{item.config.cityName} / {label(item.config.serviceType)}</td><td><Badge>{item.previousStage}</Badge></td><td><Badge>{item.newStage}</Badge></td><td>{item.reason}</td><td>{item.adminUserId}</td><td>{dateTime(item.createdAt)}</td></tr>)}</tbody></table> : <Empty>No launch configuration changes have been made.</Empty>}</section>;
}
