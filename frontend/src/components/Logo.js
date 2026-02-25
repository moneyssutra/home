/**
 * MoneySSutra Logo Component
 * Brand colors: Teal #3EEBC2, Navy #1A1F3D
 * Uses actual brand PNG assets
 */
export const LogoIcon = ({ size = 32, className = "" }) => (
  <img
    src="/assets/branding/logo-icon.png"
    alt="MoneySSutra"
    style={{ height: size, width: "auto" }}
    className={className}
    data-testid="logo-icon"
  />
);

export const LogoFull = ({ height = 80, className = "" }) => (
  <img
    src="/assets/branding/logo-full.png"
    alt="MoneySSutra"
    style={{ height, width: "auto" }}
    className={className}
    data-testid="logo-full"
  />
);

export const LogoWordmark = ({ className = "" }) => (
  <span className={`font-extrabold tracking-[0.2em] ${className}`} style={{ fontFamily: "'Montserrat', sans-serif" }} data-testid="logo-wordmark">
    <span style={{ color: "#FFFFFF" }}>MONEY</span>
    <span style={{ color: "#3EEBC2" }}>SSUTRA</span>
  </span>
);

export const BRAND = {
  teal: "#3EEBC2",
  navy: "#1A1F3D",
  highlight: "#48E5E8",
  shadow: "#0D1427",
  company: "NEXT GENERATION LEADERSHIP PRIVATE LIMITED",
  email: "support@moneyssutra.com",
  website: "www.moneyssutra.com",
};
