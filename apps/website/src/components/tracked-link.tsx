"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ComponentProps, MouseEvent } from "react";
import { AnalyticsEventName, AnalyticsEventParameters, trackAnalyticsEvent } from "../lib/analytics";

type AnalyticsProps<K extends AnalyticsEventName> = {
  analyticsEvent: K;
  analyticsParameters: AnalyticsEventParameters[K];
};

type TrackedAnchorProps<K extends AnalyticsEventName> = ComponentProps<"a"> & AnalyticsProps<K>;

export function TrackedAnchor<K extends AnalyticsEventName>({
  analyticsEvent,
  analyticsParameters,
  onClick,
  ...props
}: TrackedAnchorProps<K>) {
  const pathname = usePathname();
  return <a {...props} onClick={(event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (!event.defaultPrevented) trackAnalyticsEvent(analyticsEvent, { ...analyticsParameters, source_path: pathname });
  }} />;
}

type TrackedLinkProps<K extends AnalyticsEventName> = ComponentProps<typeof Link> & AnalyticsProps<K>;

export function TrackedLink<K extends AnalyticsEventName>({
  analyticsEvent,
  analyticsParameters,
  onClick,
  ...props
}: TrackedLinkProps<K>) {
  const pathname = usePathname();
  return <Link {...props} onClick={(event) => {
    onClick?.(event);
    if (!event.defaultPrevented) trackAnalyticsEvent(analyticsEvent, { ...analyticsParameters, source_path: pathname });
  }} />;
}
