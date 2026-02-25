import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, Eye, Lock, Server, Trash2, Mail, Building2 } from "lucide-react";

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen pb-12" style={{ backgroundColor: "var(--bg-app)" }} data-testid="privacy-page">
      <header className="sticky top-0 z-40 px-4 py-4 flex items-center gap-3" style={{ backgroundColor: "var(--bg-app)", borderBottom: "1px solid var(--border-light)" }}>
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full flex items-center justify-center" data-testid="back-button">
          <ArrowLeft className="h-5 w-5" style={{ color: "var(--text-primary)" }} />
        </button>
        <h1 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Privacy Policy</h1>
      </header>

      <div className="px-5 py-6 max-w-3xl mx-auto space-y-6">
        {/* Header Card */}
        <div className="rounded-2xl p-5" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "rgba(5,150,105,0.1)" }}>
              <Shield className="h-5 w-5" style={{ color: "#059669" }} />
            </div>
            <div>
              <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>Privacy Policy</h2>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Effective Date: 25 February, 2026</p>
            </div>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            This Privacy Policy explains how <span className="font-bold">NEXT GENERATION LEADERSHIP PRIVATE LIMITED</span> ("Company", "we", "our", "us") collects, uses, and protects user information in relation to MoneySSutra.
          </p>
        </div>

        {/* Section 1 - Information We Collect */}
        <div className="rounded-2xl p-4" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(5,150,105,0.1)", color: "#059669" }}>1</span>
            <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Information We Collect</h3>
          </div>
          <div className="space-y-3">
            {[
              { label: "A. Personal Information", icon: Eye, items: ["Name", "Email address", "Phone number"] },
              { label: "B. Financial Information (User Provided)", icon: Server, items: ["Income details", "Expenses", "Liabilities", "Assets", "Investments"] },
              { label: "C. Technical Information", icon: Lock, items: ["Device type", "OS version", "Usage data", "App interaction metrics"] },
            ].map((cat) => (
              <div key={cat.label} className="p-3 rounded-xl" style={{ backgroundColor: "var(--bg-subtle, rgba(0,0,0,0.02))" }}>
                <div className="flex items-center gap-2 mb-1">
                  <cat.icon className="h-3.5 w-3.5" style={{ color: "#059669" }} />
                  <span className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>{cat.label}</span>
                </div>
                <ul className="text-xs space-y-0.5 pl-5 list-disc" style={{ color: "var(--text-secondary)" }}>
                  {cat.items.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Section 2 - Future Permissions */}
        <div className="rounded-2xl p-4" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(5,150,105,0.1)", color: "#059669" }}>2</span>
            <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Future Permissions (If Enabled)</h3>
          </div>
          <div className="space-y-2">
            <div className="p-3 rounded-xl" style={{ backgroundColor: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.15)" }}>
              <p className="text-xs font-bold mb-1" style={{ color: "#D97706" }}>SMS Access (Android Only)</p>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>If enabled, SMS access will be used solely to identify financial transaction messages for categorization. Personal conversations are not accessed or stored.</p>
            </div>
            <div className="p-3 rounded-xl" style={{ backgroundColor: "rgba(59,130,246,0.05)", border: "1px solid rgba(59,130,246,0.15)" }}>
              <p className="text-xs font-bold mb-1" style={{ color: "#2563EB" }}>Bank Integration (Smart Sync)</p>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>If users opt into Smart Sync, financial data will be accessed only through RBI-regulated Account Aggregators with explicit consent.</p>
            </div>
          </div>
        </div>

        {/* Remaining sections */}
        {[
          {
            num: "3", title: "How We Use Information",
            custom: (
              <>
                <p className="text-sm mb-2" style={{ color: "var(--text-secondary)" }}>We use collected information to:</p>
                <ul className="text-sm space-y-1 list-disc pl-5 mb-2" style={{ color: "var(--text-secondary)" }}>
                  <li>Calculate financial metrics</li>
                  <li>Generate survival scores</li>
                  <li>Provide behavioral insights</li>
                  <li>Improve system performance</li>
                  <li>Enhance user experience</li>
                </ul>
                <p className="text-sm font-bold" style={{ color: "#059669" }}>We do NOT sell user data.</p>
              </>
            )
          },
          {
            num: "4", title: "Data Sharing",
            custom: (
              <>
                <p className="text-sm mb-2" style={{ color: "var(--text-secondary)" }}>We may share limited data with:</p>
                <ul className="text-sm space-y-1 list-disc pl-5" style={{ color: "var(--text-secondary)" }}>
                  <li>Cloud hosting providers</li>
                  <li>Analytics providers</li>
                  <li>Legal authorities if required by law</li>
                </ul>
                <p className="text-sm mt-2" style={{ color: "var(--text-secondary)" }}>All service providers are bound by confidentiality agreements.</p>
              </>
            )
          },
          {
            num: "5", title: "Data Security",
            custom: (
              <>
                <p className="text-sm mb-2" style={{ color: "var(--text-secondary)" }}>We implement:</p>
                <ul className="text-sm space-y-1 list-disc pl-5" style={{ color: "var(--text-secondary)" }}>
                  <li>Encrypted data transmission (HTTPS)</li>
                  <li>Secure cloud infrastructure</li>
                  <li>Password hashing</li>
                  <li>Access control restrictions</li>
                </ul>
                <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>However, no system can guarantee complete security.</p>
              </>
            )
          },
          { num: "6", title: "Data Retention", content: "We retain user data only while the account remains active, as required for service functionality, or as required by law." },
          {
            num: "7", title: "User Rights",
            custom: (
              <>
                <p className="text-sm mb-2" style={{ color: "var(--text-secondary)" }}>Users may:</p>
                <ul className="text-sm space-y-1 list-disc pl-5" style={{ color: "var(--text-secondary)" }}>
                  <li>Access their data</li>
                  <li>Correct inaccuracies</li>
                  <li>Request deletion</li>
                  <li>Withdraw consent</li>
                </ul>
                <p className="text-sm mt-2" style={{ color: "var(--text-secondary)" }}>Contact: <span className="font-medium">support@moneyssutra.com</span></p>
              </>
            )
          },
          {
            num: "8", title: "Account Deletion",
            content: null,
            custom: (
              <>
                <p className="text-sm mb-1" style={{ color: "var(--text-secondary)" }}>Upon deletion request: personal and financial data will be permanently removed. Some anonymized analytical data may be retained. Requests are processed within a reasonable timeframe.</p>
                <p className="text-sm mt-2" style={{ color: "var(--text-secondary)" }}>See our <a href="/data-deletion" className="underline font-medium" style={{ color: "#059669" }}>Data Deletion Policy</a> for full details.</p>
              </>
            )
          },
          { num: "9", title: "Children's Privacy", content: "MoneySSutra is not intended for users under 18 years of age." },
          { num: "10", title: "Changes to Policy", content: "We may update this Privacy Policy periodically. Material changes will be communicated through the app or website." },
          {
            num: "11", title: "Contact",
            custom: (
              <div className="space-y-1 text-sm" style={{ color: "var(--text-secondary)" }}>
                <p className="font-bold" style={{ color: "var(--text-primary)" }}>NEXT GENERATION LEADERSHIP PRIVATE LIMITED</p>
                <p>Email: support@moneyssutra.com</p>
                <p>Website: <a href="https://www.moneyssutra.com" className="underline" style={{ color: "#059669" }}>www.moneyssutra.com</a></p>
              </div>
            )
          },
        ].map((section) => (
          <div key={section.num} className="rounded-2xl p-4" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(5,150,105,0.1)", color: "#059669" }}>{section.num}</span>
              <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{section.title}</h3>
            </div>
            {section.content && <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{section.content}</p>}
            {section.custom}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PrivacyPolicy;
