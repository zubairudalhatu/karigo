import { usePathname } from "expo-router";
import { useEffect } from "react";
import { checkForCustomerUpdateAtStartup, isSensitiveCustomerUpdateRoute } from "../lib/customer-updates";

export function CustomerOtaUpdateGate() {
  const pathname = usePathname();

  useEffect(() => {
    if (isSensitiveCustomerUpdateRoute(pathname)) return;
    void checkForCustomerUpdateAtStartup(pathname);
  }, [pathname]);

  return null;
}
