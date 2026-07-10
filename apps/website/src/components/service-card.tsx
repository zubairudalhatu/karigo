import { services } from "../lib/site";

const serviceIcons = {
  food: <><path d="M8 6h10" /><path d="M9 6v12" /><path d="M17 6v12" /><path d="M6 18h14" /></>,
  groceries: <><circle cx="9" cy="19" r="1.5" /><circle cx="17" cy="19" r="1.5" /><path d="M4 5h2l2 10h10l2-7H8" /></>,
  taxi: <><path d="M6 12l2-5h8l2 5" /><path d="M5 12h14v5H5z" /><circle cx="8" cy="17" r="1" /><circle cx="16" cy="17" r="1" /></>,
  market: <><path d="M6 9h12l-1 11H7L6 9z" /><path d="M9 9a3 3 0 0 1 6 0" /></>,
  pharmacy: <><path d="M12 5v14" /><path d="M5 12h14" /><rect x="6" y="6" width="12" height="12" rx="3" /></>,
  parcel: <><path d="M5 8l7-4 7 4v8l-7 4-7-4z" /><path d="M5 8l7 4 7-4" /><path d="M12 12v8" /></>,
  errands: <><path d="M5 12l4 4 10-10" /><path d="M5 20h14" /></>,
  airtime: <><rect x="8" y="4" width="8" height="16" rx="2" /><path d="M11 17h2" /></>,
  data: <><circle cx="12" cy="12" r="7" /><path d="M5 12h14" /><path d="M12 5a12 12 0 0 1 0 14" /><path d="M12 5a12 12 0 0 0 0 14" /></>,
  electricity: <><path d="M13 3L6 14h5l-1 7 8-12h-5z" /></>,
  cable: <><rect x="5" y="6" width="14" height="10" rx="2" /><path d="M9 20h6" /><path d="M12 16v4" /></>
} as const;

function ServiceIcon({ name }: { name: string }) {
  return (
    <svg aria-hidden="true" className="service-icon-svg" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      {serviceIcons[name as keyof typeof serviceIcons] ?? serviceIcons.errands}
    </svg>
  );
}

export function ServiceCard({ service }: { service: (typeof services)[number] }) {
  const readiness = service.status !== "Live";
  const taxi = service.title === "Taxi";
  return (
    <article className="service-card">
      <span className="service-icon" aria-hidden="true"><ServiceIcon name={service.icon} /></span>
      <div>
        <div className="card-title-row">
          <h3>{service.title}</h3>
          {readiness ? <span className="badge badge-muted">{service.status}</span> : <span className="badge">Live</span>}
        </div>
        <p>{service.description}</p>
        {taxi ? <a className="button secondary small-button" href="/riders#taxi-waitlist">Join Taxi Waitlist</a> : null}
      </div>
    </article>
  );
}
