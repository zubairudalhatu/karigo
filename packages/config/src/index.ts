export const brand = {
  name: "KariGO",
  companyName: "KariGO Express Limited",
  tagline: "Food, errands and packages - all in one app.",
  colors: {
    primary: "#E11D2E",
    primaryDark: "#B81422",
    charcoal: "#202124",
    black: "#111111",
    white: "#FFFFFF",
    background: "#F5F6F8",
    muted: "#6B7280",
    border: "#E5E7EB",
    success: "#15803D",
    warning: "#D97706",
    info: "#2563EB"
  },
  assets: {
    logo: "../assets/karigo-logo.png"
  }
} as const;

export type BrandColors = typeof brand.colors;

export * from "./api";
