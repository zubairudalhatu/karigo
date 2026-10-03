import type { Metadata } from "next";

export const canonicalOrigin = "https://karigo.com.ng";
export const socialImagePath = "/karigo-social-card.png";

export const indexableRoutes = [
  "/",
  "/contact",
  "/riders",
  "/vendors",
  "/vendors/apply",
  "/safety",
  "/careers",
  "/privacy",
  "/terms",
  "/account-deletion",
  "/refunds",
  "/returns",
  "/services",
  "/sme-services/apply"
] as const;

export function absoluteUrl(path: string) {
  return new URL(path, canonicalOrigin).toString();
}

export function buildPageMetadata({
  title,
  description,
  path
}: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  const canonical = absoluteUrl(path);
  const socialTitle = `${title} | KariGO`;
  const image = absoluteUrl(socialImagePath);

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title: socialTitle,
      description,
      url: canonical,
      siteName: "KariGO",
      type: "website",
      images: [{ url: image, width: 1200, height: 630, alt: "KariGO" }]
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description,
      images: [image]
    }
  };
}

export const privatePageRobots: Metadata["robots"] = {
  index: false,
  follow: false,
  googleBot: { index: false, follow: false }
};
