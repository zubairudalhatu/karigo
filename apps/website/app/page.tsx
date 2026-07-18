import Link from "next/link";
import { ServiceCard } from "../src/components/service-card";
import { services } from "../src/lib/site";

export default function HomePage() {
  return (
    <main>
      <section className="hero">
        <div>
          <p className="eyebrow">Delivering Nigeria. Connecting You.</p>
          <h1>Everything you need, delivered.</h1>
          <p className="lead">Order food, shop groceries and market items, send parcels, request SME Services and prepare for more everyday services with KariGO.</p>
          <p className="tagline">Food, groceries, market items, parcels, SME Services and everyday support across Kano and Abuja.</p>
          <div className="actions">
            <a className="button" href="#download">Download the App</a>
            <Link className="button secondary" href="/vendors/apply">Become a Vendor</Link>
            <Link className="button secondary" href="/sme-services/apply">Become a Service Provider</Link>
          </div>
        </div>
        <div className="app-visual" aria-label="KariGO app-style visual mockup">
          <div className="phone-card">
            <div className="screen-mock">
              <div className="mock-bar"><strong>KariGO</strong><span className="mock-pill">Kano + Abuja</span></div>
              <div className="mock-grid">
                <div className="mock-tile">Food</div>
                <div className="mock-tile">Groceries</div>
                <div className="mock-tile">Rides</div>
                <div className="mock-tile">Market</div>
                <div className="mock-tile">Parcel</div>
                <div className="mock-tile">Bills</div>
              </div>
              <div className="mock-order">
                <strong>Kano Kitchen</strong>
                <span>Order paid - vendor preparing</span>
                <span className="badge">Track order</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="services">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Services</p>
            <h2>Everyday services, one trusted platform.</h2>
          </div>
          <p>Services under provider or operations approval are clearly marked before activation.</p>
        </div>
        <div className="service-grid">{services.map((service) => <ServiceCard key={service.title} service={service} />)}</div>
      </section>

      <section className="section soft">
        <div className="section-heading">
          <div>
            <p className="eyebrow">How KariGO works</p>
            <h2>Simple from request to delivery.</h2>
          </div>
        </div>
        <div className="steps">
          <article className="step"><h3>Choose a service</h3><p>Start with food, groceries, market items, parcels or SME Services.</p></article>
          <article className="step"><h3>Place your order or request</h3><p>Pick the vendor, enter delivery details and confirm safely.</p></article>
          <article className="step"><h3>Track progress</h3><p>Follow order, vendor, dispatch and delivery updates.</p></article>
          <article className="step"><h3>Receive delivery or service</h3><p>Complete delivery securely with KariGO controls.</p></article>
        </div>
      </section>

      <section className="section split">
        <article className="info-card" id="vendors">
          <p className="eyebrow">For Vendors</p>
          <h2>Grow your business with KariGO.</h2>
          <p>Restaurants, groceries, market sellers and approved service providers can apply to reach customers across Kano and Abuja. KariGO reviews every application before onboarding.</p>
          <div className="actions">
            <Link className="button" href="/vendors/apply">Apply as a Vendor</Link>
            <Link className="button secondary" href="/sme-services/apply">Become a Service Provider</Link>
          </div>
        </article>
        <article className="info-card">
          <p className="eyebrow">For Captains</p>
          <h2>Earn with KariGO.</h2>
          <p>Delivery Captains are supported now. Ride Captain applications are open for review with verification, safety and operational controls before Ride dispatch activation.</p>
          <div className="actions">
            <Link className="button secondary" href="/riders">Captain Details</Link>
            <Link className="button" href="/riders#ride-waitlist">Join Ride Waitlist</Link>
          </div>
        </article>
      </section>

      <section className="section soft">
        <div className="split">
          <article>
            <p className="eyebrow">Bills & Utilities</p>
            <h2>Secure utility payments are being prepared.</h2>
            <p className="lead">KariGO is preparing secure merchant integrations for airtime, data, electricity and cable TV payments.</p>
            <p>KariGO will activate these services only after provider, security and operational review.</p>
          </article>
          <article className="info-card" id="download">
            <p className="eyebrow">Download App</p>
            <h2>Customer app rollout</h2>
            <div className="store-badges" aria-label="Future app store availability">
              <div className="store-badge" aria-disabled="true">
                <span className="store-mark" aria-hidden="true">GP</span>
                <span><small>Preparing for</small><strong>Google Play</strong></span>
              </div>
              <div className="store-badge store-badge-muted" aria-disabled="true">
                <span className="store-mark" aria-hidden="true">A</span>
                <span><small>Planned for</small><strong>App Store</strong></span>
              </div>
            </div>
            <p><strong>Android:</strong> Preparing for Google Play release. Controlled onboarding access is shared separately.</p>
            <p><strong>iOS:</strong> Coming later.</p>
          </article>
        </div>
      </section>
    </main>
  );
}
