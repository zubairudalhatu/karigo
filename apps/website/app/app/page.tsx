import type { Metadata } from "next";
import { CustomerWebPortal } from "../../src/components/customer-web-portal";
import { absoluteUrl, privatePageRobots } from "../../src/lib/seo";

export const metadata: Metadata = {
  title: "Customer App",
  description: "Customer web portal for KariGO account, wallet, Utilities and SME Services access.",
  alternates: { canonical: absoluteUrl("/app") },
  robots: privatePageRobots,
  openGraph: null,
  twitter: null
};

export default function CustomerWebPortalPage() {
  return <CustomerWebPortal />;
}
