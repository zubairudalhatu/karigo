import { canonicalOrigin } from "./seo";

const allowedActions = new Set(["click", "close", "failure", "open", "submit", "success"]);
const allowedComponents = new Set(["footer", "form", "navigation", "store_badge"]);

export function safeAnalyticsPagePath(value: string) {
  try {
    return new URL(value, canonicalOrigin).pathname;
  } catch {
    return "/";
  }
}

export function safeAnalyticsParameters(input: Record<string, unknown>) {
  const output: Record<string, string> = {};

  if (typeof input.action === "string" && allowedActions.has(input.action)) output.action = input.action;
  if (typeof input.component === "string" && allowedComponents.has(input.component)) output.component = input.component;
  if (typeof input.destination === "string") output.destination = safeAnalyticsPagePath(input.destination);
  if (typeof input.page_path === "string") output.page_path = safeAnalyticsPagePath(input.page_path);

  return output;
}
