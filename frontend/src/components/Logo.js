/**
 * MoneySSutra Logo Component
 * Brand colors: Teal #00D1CC, Navy #1B263B
 */
export const LogoIcon = ({ size = 32, className = "" }) => (
  <img
    src="/assets/branding/logo-icon.svg"
    alt="MoneySSutra"
    width={size}
    height={size}
    className={className}
    data-testid="logo-icon"
  />
);

export const LogoFull = ({ height = 48, className = "" }) => (
  <img
    src="/assets/branding/logo-full.svg"
    alt="MoneySSutra"
    height={height}
    className={className}
    style={{ height }}
    data-testid="logo-full"
  />
);

export const LogoWordmark = ({ className = "" }) => (
  <span
    className={`font-extrabold tracking-widest ${className}`}
    style={{ fontFamily: "'Montserrat', sans-serif", color: "#00D1CC" }}
    data-testid="logo-wordmark"
  >
    MONEYSSUTRA
  </span>
);

export const BRAND = {
  teal: "#00D1CC",
  navy: "#1B263B",
  highlight: "#48E5E8",
  shadow: "#0D1427",
  company: "NEXT GENERATION LEADERSHIP PRIVATE LIMITED",
  email: "support@moneyssutra.com",
  website: "www.moneyssutra.com",
};
