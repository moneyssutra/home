/**
 * Indian bank logo URLs — HD SVG icons from curated open-source repo.
 * Falls back to Google Favicon API for fintechs/international banks.
 * Used across BankAccounts, CreditCards, and any bank-related UI.
 */

const gh = (slug) => `https://raw.githubusercontent.com/praveenpuglia/indian-banks/main/assets/logos/${slug}/symbol.svg`;
const gf = (domain) => `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;

const BANK_LOGOS = {
  // Major Indian banks — HD SVG vectors (crisp at any size)
  sbi:        gh("sbin"),
  hdfc:       gh("hdfc"),
  icici:      gh("icic"),
  kotak:      gh("kkbk"),
  axis:       gh("utib"),
  idfc:       gh("idfb"),
  yes:        gh("yesb"),
  bob:        gh("barb"),
  baroda:     gh("barb"),
  pnb:        gh("punb"),
  canara:     gh("cnrb"),
  union:      gh("ubin"),
  indian:     gh("idib"),
  indusind:   gh("indb"),
  rbl:        gh("ratn"),
  paytm:      gh("pytm"),
  au:         gh("aubl"),
  federal:    gh("fdrl"),
  bandhan:    gh("bdbl"),
  standard:   gh("scbl"),
  chartered:  gh("scbl"),
  iob:        gh("ioba"),
  uco:        gh("ucba"),
  // Fintechs & international — Google Favicon fallback
  citi:       gf("citibank.co.in"),
  bajaj:      gf("bajajfinserv.in"),
  fi:         gf("fi.money"),
  jupiter:    gf("jupiter.money"),
  niyo:       gf("goniyo.com"),
  hsbc:       gf("hsbc.co.in"),
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
  const isSvg = logoUrl && logoUrl.endsWith(".svg");
  // SVG logos are vectors — use 80% fill; raster favicons use 72%
  const imgSize = isSvg ? "w-[80%] h-[80%]" : "w-[72%] h-[72%]";

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
          className={`${imgSize} object-contain`}
          loading="eager"
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
