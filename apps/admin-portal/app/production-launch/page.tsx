"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import {
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
  productionLaunchApi,
  ReadinessStatus
} from "../../src/api/production-launch.api";
import { Badge, Empty, ErrorMessage, Loading, PortalShell } from "../../src/components/portal";
import { friendlyError } from "../../src/lib/errors";

const stages: LaunchStage[] = ["OFF", "OPERATIONS_ONLY", "INVITE_ONLY", "LIMITED_PUBLIC", "CITY_WIDE", "PAUSED"];
const services: LaunchServiceType[] = ["RIDES", "FOOD", "GROCERIES", "MARKETPLACE", "PARCEL_DELIVERY", "SME_SERVICES"];
const readinessStatuses: ReadinessStatus[] = ["NOT_READY", "AT_RISK", "READY", "WAIVED"];
const drillTypes = ["RIDE_END_TO_END", "DELIVERY_END_TO_END", "PRODUCT_ORDER_END_TO_END", "SERVICE_REQUEST_END_TO_END", "PAYMENT_SUCCESS", "PAYMENT_FAILURE", "CUSTOMER_CANCELLATION", "CAPTAIN_CANCELLATION", "PARTNER_REJECTION", "SUPPORT_ESCALATION", "EMERGENCY_SERVICE_PAUSE"];
type View = "command" | "readiness" | "supply" | "cohorts" | "incidents" | "support" | "drills" | "reports" | "history";

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
  const [view, setView] = useState<View>("command");
  const [command, setCommand] = useState<LaunchCommandCentre | null>(null);
  const [configs, setConfigs] = useState<LaunchConfig[]>([]);
  const [readiness, setReadiness] = useState<LaunchReadiness[]>([]);
  const [cohorts, setCohorts] = useState<LaunchCohort[]>([]);
  const [incidents, setIncidents] = useState<LaunchIncident[]>([]);
  const [drills, setDrills] = useState<LaunchDrill[]>([]);
  const [support, setSupport] = useState<LaunchSupportQueue | null>(null);
  const [report, setReport] = useState<DailyLaunchReport | null>(null);
  const [history, setHistory] = useState<LaunchHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [nextCommand, nextConfigs, kano, abuja, nextCohorts, nextIncidents, nextDrills, nextSupport, nextReport, nextHistory] = await Promise.all([
        productionLaunchApi.commandCentre(), productionLaunchApi.configs(), productionLaunchApi.readiness("Kano"), productionLaunchApi.readiness("Abuja"), productionLaunchApi.cohorts(), productionLaunchApi.incidents(), productionLaunchApi.drills(), productionLaunchApi.supportQueue(), productionLaunchApi.report(), productionLaunchApi.history()
      ]);
      setCommand(nextCommand); setConfigs(nextConfigs); setReadiness([kano, abuja]); setCohorts(nextCohorts); setIncidents(nextIncidents); setDrills(nextDrills); setSupport(nextSupport); setReport(nextReport); setHistory(nextHistory);
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
      {(["command", "readiness", "supply", "cohorts", "incidents", "support", "drills", "reports", "history"] as View[]).map((item) => <button key={item} className={view === item ? "" : "secondary"} onClick={() => setView(item)}>{label(item)}</button>)}
      <button className="secondary" onClick={() => void load()}>Refresh</button>
    </div>
    {message ? <p className="success">{message}</p> : null}
    <ErrorMessage>{error}</ErrorMessage>
    {loading ? <Loading /> : null}

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
          <article className="card"><span className="muted">Open incidents</span><p className="metric">{city.openIncidents}</p><p>{city.lastSuccessfulOperationalTransaction ? `${city.lastSuccessfulOperationalTransaction.type} ${city.lastSuccessfulOperationalTransaction.reference}` : "No successful transaction recorded"}</p></article>
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
    {!loading && view === "cohorts" ? <CohortsView cohorts={cohorts} action={action} /> : null}
    {!loading && view === "incidents" ? <IncidentsView incidents={incidents} action={action} /> : null}
    {!loading && view === "drills" ? <DrillsView drills={drills} action={action} /> : null}
    {!loading && view === "support" ? <SupportView support={support} /> : null}
    {!loading && view === "reports" ? <ReportsView report={report} /> : null}
    {!loading && view === "history" ? <HistoryView history={history} /> : null}
  </PortalShell>;
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

function DrillsView({ drills, action }: { drills: LaunchDrill[]; action: (fn: () => Promise<unknown>, message: string) => Promise<void> }) {
  const [city, setCity] = useState("KANO"); const [drillType, setDrillType] = useState(drillTypes[0]); const [reference, setReference] = useState("");
  return <section className="section"><h2>Controlled transaction drills</h2><article className="card"><div className="form-grid"><label>City<select value={city} onChange={(event) => setCity(event.target.value)}><option>KANO</option><option>ABUJA</option></select></label><label>Drill type<select value={drillType} onChange={(event) => setDrillType(event.target.value)}>{drillTypes.map((item) => <option key={item}>{item}</option>)}</select></label><label>Existing request/order reference<input value={reference} onChange={(event) => setReference(event.target.value)} /></label></div><button onClick={() => void action(() => productionLaunchApi.createDrill({ city, drillType, relatedReference: reference || undefined }), "Drill record created. No real transaction was initiated.")}>Create drill record</button></article>
    {drills.length ? <table className="table"><thead><tr><th>City</th><th>Drill</th><th>Reference</th><th>Result</th><th>Action</th></tr></thead><tbody>{drills.map((drill) => <tr key={drill.id}><td>{drill.cityCode}</td><td>{label(drill.drillType)}</td><td>{drill.relatedReference ?? "Not linked"}</td><td><Badge>{drill.result}</Badge></td><td><button onClick={() => void action(() => productionLaunchApi.updateDrill(drill.id, { result: "PASSED", notes: "Operations evidence reviewed" }), "Drill marked passed and audited.")}>Mark passed</button></td></tr>)}</tbody></table> : <Empty>No controlled drill records.</Empty>}
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
