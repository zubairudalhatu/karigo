import type { Metadata } from "next";
import { CustomerWebPortal } from "../../src/components/customer-web-portal";

export const metadata: Metadata = {
  title: "Customer App",
  description: "Customer web portal for KariGO account, wallet, Utilities and SME Services access."
};

export default function CustomerWebPortalPage() {
  return <CustomerWebPortal />;
}
