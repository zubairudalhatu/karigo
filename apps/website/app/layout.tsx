import type { Metadata, Viewport } from "next";
import { ReactNode } from "react";
import { SiteFooter } from "../src/components/site-footer";
import { SiteHeader } from "../src/components/site-header";
import { site } from "../src/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(site.preferredUrl),
  title: {
    default: "KariGO - Everything You Need, Delivered",
    template: "%s | KariGO"
  },
  description: "Food, groceries, market items, parcel delivery and everyday services across Kano.",
  openGraph: {
    title: "KariGO - Everything You Need, Delivered",
    description: "Food, groceries, market items, parcel delivery and everyday services across Kano.",
    url: site.preferredUrl,
    siteName: "KariGO",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "KariGO - Everything You Need, Delivered",
    description: "Food, groceries, market items, parcel delivery and everyday services across Kano."
  },
  icons: {
    icon: "/karigo-logo.png"
  }
};

export const viewport: Viewport = {
  themeColor: "#E11D2E",
  colorScheme: "light"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
