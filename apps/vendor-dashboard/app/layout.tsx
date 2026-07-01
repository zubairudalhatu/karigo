import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "../src/contexts/auth-context";

export const metadata: Metadata = {
  title: "KariGO Vendor Dashboard",
  description: "Manage KariGO vendor orders, products and settlements"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><AuthProvider>{children}</AuthProvider></body></html>;
}
