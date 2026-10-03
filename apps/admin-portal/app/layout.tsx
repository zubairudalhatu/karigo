import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "../src/contexts/auth-context";

export const metadata: Metadata = {
  title: "KariGO Admin Portal",
  description: "KariGO operations control centre",
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><AuthProvider>{children}</AuthProvider></body></html>;
}
