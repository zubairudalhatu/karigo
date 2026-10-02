import Image from "next/image";

const partnerTypes = [
  {
    title: "Product Seller",
    description: "Restaurants, grocery stores, market sellers and approved product vendors.",
    items: ["Business details", "Store location", "Documents", "Catalogue setup"],
    href: "https://www.karigo.com.ng/vendors/apply?partnerType=product-seller"
  },
  {
    title: "Service Provider",
    description: "SME service providers such as plumbers, cleaners, printing shops, legal practitioners and car-hire operators.",
    items: ["Service category", "Service areas", "Availability", "Verification details"],
    href: "https://www.karigo.com.ng/vendors/apply?partnerType=service-provider"
  },
  {
    title: "Both",
    description: "Businesses that sell products and also offer approved SME Services.",
    items: ["Unified profile", "Product catalogue", "Service catalogue", "Admin review"],
    href: "https://www.karigo.com.ng/vendors/apply?partnerType=both"
  }
];

export default function PartnerRegisterPage() {
  return <div className="partner-public-shell">
    <header className="partner-public-header">
      <a className="partner-public-brand" href="https://www.karigo.com.ng" aria-label="KariGO home">
        <Image src="/karigo-logo.png" alt="KariGO" width={80} height={80} priority />
        <span><strong>KariGO</strong><small>Partner Workspace</small></span>
      </a>
      <nav aria-label="Partner registration links">
        <a href="https://www.karigo.com.ng">Back to KariGO</a>
        <a href="https://www.karigo.com.ng/contact">Help / Support</a>
      </nav>
    </header>
    <main className="login partner-register">
    <section className="partner-register-card">
      <p className="muted">KariGO Partner Workspace</p>
      <h1>Choose how you want to partner with KariGO.</h1>
      <p>Product sellers and SME service providers now use one partner onboarding path. Approval is not automatic, and account access is activated only after KariGO review.</p>
      <div className="partner-type-grid">
        {partnerTypes.map((type) => <article className="card" key={type.title}>
          <h2>{type.title}</h2>
          <p className="muted">{type.description}</p>
          <ul>
            {type.items.map((item) => <li key={item}>{item}</li>)}
          </ul>
          <a className="button-link" href={type.href}>Start {type.title} onboarding</a>
        </article>)}
      </div>
      <div className="notice">
        <strong>Safe onboarding guardrails</strong>
        <p>No live dispatch, payouts, legal advice automation, vehicle rental contracts, pharmacy marketplace access or public provider contact sharing are activated by registration.</p>
      </div>
      <p className="muted">Already approved? <a href="/login">Sign in to the Partner Workspace</a> or <a href="/activate">set up your password</a>.</p>
    </section>
    </main>
    <footer className="partner-public-footer">
      <nav aria-label="Partner Workspace legal and support links">
        <a href="https://www.karigo.com.ng/privacy">Privacy</a>
        <a href="https://www.karigo.com.ng/terms">Terms</a>
        <a href="https://www.karigo.com.ng/contact">Support</a>
      </nav>
      <div><p>&copy; 2026 KariGO Express Limited</p><p>A <strong>Zamkah Technologies Limited</strong> company</p></div>
    </footer>
  </div>;
}
