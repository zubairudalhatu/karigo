import { services } from "../lib/site";

export function ServiceCard({ service }: { service: (typeof services)[number] }) {
  const readiness = service.status !== "Live";
  return (
    <article className="service-card">
      <span className="service-icon" aria-hidden="true">{service.icon}</span>
      <div>
        <div className="card-title-row">
          <h3>{service.title}</h3>
          {readiness ? <span className="badge badge-muted">{service.status}</span> : <span className="badge">Live</span>}
        </div>
        <p>{service.description}</p>
      </div>
    </article>
  );
}
