import { services } from "../lib/site";

export function ServiceCard({ service }: { service: (typeof services)[number] }) {
  const readiness = service.status !== "Live";
  const taxi = service.title === "Taxi";
  return (
    <article className="service-card">
      <span className="service-icon" aria-hidden="true"><span>{service.icon}</span></span>
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
