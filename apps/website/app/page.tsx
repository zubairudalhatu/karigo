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
          <p className="lead">Order food, shop groceries and market items, send parcels, request errands and prepare for more everyday services with KariGO.</p>
          <p className="tagline">Food, groceries, market items, parcels, errands and everyday services across Kano.</p>
          <div className="actions">
            <a className="button" href="#download">Download the App</a>
            <Link className="button secondary" href="/vendors/apply">Become a Vendor</Link>
          </div>
        </div>
        <div className="app-visual" aria-label="KariGO app-style visual mockup">
          <div className="phone-card">
            <div className="screen-mock">
              <div className="mock-bar"><strong>KariGO</strong><span className="mock-pill">Kano</span></div>
              <div className="mock-grid">
                <div className="mock-tile">Food</div>
                <div className="mock-tile">Groceries</div>
                <div className="mock-tile">Taxi soon</div>
                <div className="mock-tile">Market</div>
                <div className="mock-tile">Parcel</div>
                <div className="mock-tile">Bills soon</div>
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
          <p>Coming-soon services are clearly marked and are not live transactions.</p>
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
          <article className="step"><h3>Choose a service</h3><p>Start with food, groceries, market items, parcels or errands.</p></article>
          <article className="step"><h3>Place your order or request</h3><p>Pick the vendor, enter delivery details and confirm safely.</p></article>
          <article className="step"><h3>Track progress</h3><p>Follow order, vendor, dispatch and delivery updates.</p></article>
          <article className="step"><h3>Receive delivery or service</h3><p>Complete delivery securely with KariGO controls.</p></article>
        </div>
      </section>

      <section className="section split">
        <article className="info-card" id="vendors">
          <p className="eyebrow">For Vendors</p>
          <h2>Grow your business with KariGO.</h2>
          <p>Restaurants, groceries, market sellers and approved service providers can apply to reach customers across Kano. KariGO reviews every application before onboarding.</p>
          <Link className="button" href="/vendors/apply">Apply as a Vendor</Link>
        </article>
        <article className="info-card">
          <p className="eyebrow">For Riders & Drivers</p>
          <h2>Earn with KariGO.</h2>
          <p>Delivery riders are supported now. Taxi driver onboarding is being prepared with verification, safety and operational controls before launch.</p>
          <Link className="button secondary" href="/riders">Join the Rider & Driver Waitlist</Link>
        </article>
      </section>

      <section className="section soft">
        <div className="split">
          <article>
            <p className="eyebrow">Bills & Utilities</p>
            <h2>Secure utility payments are being prepared.</h2>
            <p className="lead">KariGO is preparing secure merchant integrations for airtime, data, electricity and cable TV payments.</p>
            <p>These services are not live yet. KariGO will activate them only after provider, security and operational review.</p>
          </article>
          <article className="info-card" id="download">
            <p className="eyebrow">Download App</p>
            <h2>Customer app rollout</h2>
            <p><strong>Android:</strong> Coming soon on Google Play. Internal test app available only through approved staging distribution.</p>
            <p><strong>iOS:</strong> Coming later.</p>
            <p>No fake app-store links are published.</p>
          </article>
        </div>
      </section>
    </main>
  );
}
