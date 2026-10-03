"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { site } from "../lib/site";
import { trackAnalyticsEvent } from "../lib/analytics";

export function AppDownloadBadges({ footer = false }: { footer?: boolean }) {
  const pathname = usePathname();
  return <div className={`app-download-badges ${footer ? "app-download-badges-footer" : ""}`} aria-label="KariGO Customer app store availability">
    <a className="google-play-badge" href={site.customerGooglePlayUrl} rel="noopener noreferrer" target="_blank" aria-label="Get the KariGO Customer app on Google Play" onClick={() => trackAnalyticsEvent("google_play_click", { source_path: pathname, placement: footer ? "footer" : "download_section", app_target: "customer_android" })}>
      <Image src="/get-it-on-google-play.png" alt="Get it on Google Play" width={162} height={63} />
    </a>
    <div className="ios-coming-soon" aria-label="KariGO iOS app coming soon">
      <span aria-hidden="true">iOS</span>
      <strong>iOS app coming soon</strong>
    </div>
  </div>;
}
