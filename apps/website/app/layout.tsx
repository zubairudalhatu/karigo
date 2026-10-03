import type { Metadata, Viewport } from "next";
import { ReactNode } from "react";
import { AnalyticsConsentProvider } from "../src/components/analytics-consent";
import { GoogleAnalytics } from "../src/components/google-analytics";
import { SiteFooter } from "../src/components/site-footer";
import { SiteHeader } from "../src/components/site-header";
import { absoluteUrl, canonicalOrigin, socialImagePath } from "../src/lib/seo";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(canonicalOrigin),
  title: {
    default: "KariGO - Everything You Need, Delivered",
    template: "%s | KariGO"
  },
  description: "Food, groceries, market items, parcel delivery and everyday services across Kano and Abuja.",
  alternates: { canonical: canonicalOrigin },
  openGraph: {
    title: "KariGO - Everything You Need, Delivered",
    description: "Food, groceries, market items, parcel delivery and everyday services across Kano and Abuja.",
    url: canonicalOrigin,
    siteName: "KariGO",
    type: "website",
    images: [{ url: absoluteUrl(socialImagePath), width: 1200, height: 630, alt: "KariGO" }]
  },
  twitter: {
    card: "summary_large_image",
    title: "KariGO - Everything You Need, Delivered",
    description: "Food, groceries, market items, parcel delivery and everyday services across Kano and Abuja.",
    images: [absoluteUrl(socialImagePath)]
  },
  icons: {
    icon: "/favicon.png",
    apple: "/apple-touch-icon.png"
  }
};

export const viewport: Viewport = {
  themeColor: "#E11D2E",
  colorScheme: "light"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": `${canonicalOrigin}/#organization`,
      name: "KariGO",
      legalName: "Zamkah Technologies Limited",
      url: canonicalOrigin,
      logo: absoluteUrl("/karigo-logo.png"),
      sameAs: [
        "https://www.instagram.com/karigoapp",
        "https://x.com/karigoapp",
        "https://www.tiktok.com/@karigoapp",
        "https://www.facebook.com/karigoapp",
        "https://www.linkedin.com/company/karigoapp"
      ],
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: "meetup@karigo.com.ng",
        telephone: "+2348057092686",
        areaServed: "NG",
        availableLanguage: "en"
      }
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${canonicalOrigin}/#website`,
      name: "KariGO",
      url: canonicalOrigin,
      publisher: { "@id": `${canonicalOrigin}/#organization` },
      inLanguage: "en"
    }
  ];

  return (
    <html lang="en">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
        />
        <AnalyticsConsentProvider>
          <SiteHeader />
          {children}
          <SiteFooter />
          <GoogleAnalytics />
        </AnalyticsConsentProvider>
      </body>
    </html>
  );
}
