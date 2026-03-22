/**
 * Indian bank logo URLs using Google Favicon API (official bank logos).
 * Used across BankAccounts, CreditCards, and any bank-related UI.
 */

const gf = (domain) => `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;

const BANK_LOGOS = {
  sbi:        gf("sbi.co.in"),
  hdfc:       gf("hdfcbank.com"),
  icici:      gf("icicibank.com"),
  kotak:      gf("kotak.com"),
  axis:       gf("axisbank.com"),
  idfc:       gf("idfcfirstbank.com"),
  yes:        gf("yesbank.in"),
  bob:        gf("bankofbaroda.in"),
  baroda:     gf("bankofbaroda.in"),
  pnb:        gf("pnbindia.in"),
  canara:     gf("canarabank.com"),
  union:      gf("unionbankofindia.co.in"),
  indian:     gf("indianbank.in"),
  citi:       gf("citibank.co.in"),
  indusind:   gf("indusind.com"),
  rbl:        gf("rblbank.com"),
  bajaj:      gf("bajajfinserv.in"),
  paytm:      gf("paytmbank.com"),
  fi:         gf("fi.money"),
  jupiter:    gf("jupiter.money"),
  niyo:       gf("goniyo.com"),
  au:         gf("aubank.in"),
  federal:    gf("federalbank.co.in"),
  bandhan:    gf("bandhanbank.com"),
  hsbc:       gf("hsbc.co.in"),
  standard:   gf("sc.com"),
  chartered:  gf("sc.com"),
  iob:        gf("iob.in"),
  uco:        gf("ucobank.com"),
  sbm:        gf("sbmbank.co.in"),
  amazon:     gf("amazon.in"),
  flipkart:   gf("flipkart.com"),
  slice:      gf("sliceit.com"),
  onecard:    gf("getonecard.app"),
  amex:       gf("americanexpress.com"),
};

/**
 * Returns the logo URL for a given bank/account name.
 * Matches against bank keywords in the name.
 */
export const getBankLogoUrl = (accountName) => {
  if (!accountName) return null;
  const nameLower = accountName.toLowerCase();
  for (const [key, url] of Object.entries(BANK_LOGOS)) {
    if (nameLower.includes(key)) return url;
  }
  return null;
};

/**
 * Returns the short abbreviation for fallback.
 */
export const getBankAbbr = (accountName) => {
  const words = (accountName || "Bank").split(/[\s-]+/);
  return words[0].slice(0, 4).toUpperCase();
};

/**
 * BankLogo component — real bank logo with fallback to gradient abbreviation.
 */
export const BankLogo = ({ name, size = 40, gradient, className = "" }) => {
  const logoUrl = getBankLogoUrl(name);
  const abbr = getBankAbbr(name);
  const dim = `${size}px`;
  const rounded = size >= 40 ? "rounded-xl" : "rounded-lg";

  if (logoUrl) {
    return (
      <div
        className={`flex items-center justify-center overflow-hidden bg-white ${rounded} ${className}`}
        style={{ width: dim, height: dim, border: "1px solid rgba(0,0,0,0.08)", flexShrink: 0 }}
        data-testid="bank-logo"
      >
        <img
          src={logoUrl}
          alt={name}
          className="w-[72%] h-[72%] object-contain"
          loading="lazy"
          onError={(e) => {
            e.target.style.display = "none";
            const parent = e.target.parentElement;
            parent.style.background = gradient
              ? `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})`
              : "linear-gradient(135deg, #334155, #1E293B)";
            parent.style.border = "none";
            const span = document.createElement("span");
            span.className = "text-[9px] font-black tracking-wider text-white";
            span.textContent = abbr;
            parent.appendChild(span);
          }}
        />
      </div>
    );
  }

  // Fallback: gradient square with abbreviation
  return (
    <div
      className={`flex items-center justify-center text-[9px] font-black tracking-wider text-white ${rounded} ${className}`}
      style={{
        width: dim,
        height: dim,
        background: gradient
          ? `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})`
          : "linear-gradient(135deg, #334155, #1E293B)",
        flexShrink: 0,
      }}
      data-testid="bank-logo"
    >
      {abbr}
    </div>
  );
};

export default BANK_LOGOS;
