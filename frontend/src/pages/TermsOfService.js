import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, Building2, Mail, Globe, Scale } from "lucide-react";
import { LogoIcon, BRAND } from "@/components/Logo";

const TermsOfService = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen pb-12" style={{ backgroundColor: "var(--bg-app)" }} data-testid="terms-page">
      <header className="sticky top-0 z-40 px-4 py-4 flex items-center gap-3" style={{ backgroundColor: "var(--bg-app)", borderBottom: "1px solid var(--border-light)" }}>
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full flex items-center justify-center" data-testid="back-button">
          <ArrowLeft className="h-5 w-5" style={{ color: "var(--text-primary)" }} />
        </button>
        <h1 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Terms of Service</h1>
      </header>

      <div className="px-5 py-6 max-w-3xl mx-auto space-y-6">
        {/* Company Banner */}
        <div className="rounded-2xl p-5" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "rgba(59,130,246,0.1)" }}>
              <Scale className="h-5 w-5" style={{ color: "#3B82F6" }} />
            </div>
            <div>
              <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>Terms of Service</h2>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Effective Date: 25 February, 2026</p>
            </div>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            This Terms of Service ("Terms") governs the use of the MoneySSutra mobile application, website (<a href="https://www.moneyssutra.com" className="underline" style={{ color: "#3B82F6" }}>www.moneyssutra.com</a>), and related services ("Services").
          </p>
          <div className="mt-3 p-3 rounded-xl" style={{ backgroundColor: "var(--bg-subtle, rgba(0,0,0,0.03))" }}>
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
              <span className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>NEXT GENERATION LEADERSHIP PRIVATE LIMITED</span>
            </div>
            <div className="text-[11px] space-y-0.5" style={{ color: "var(--text-muted)" }}>
              <p>CIN: U80903JH2021PTC017467</p>
              <p>PAN: AAHCN8903F &nbsp;|&nbsp; TAN: RCHN01417D</p>
              <p>Incorporated: 26/10/2021 &nbsp;|&nbsp; Registered in India &nbsp;|&nbsp; PIN: 831004</p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <Mail className="h-3.5 w-3.5" style={{ color: "var(--text-muted)" }} />
            <span className="text-xs" style={{ color: "var(--text-secondary)" }}>support@moneyssutra.com</span>
          </div>
        </div>

        {/* Sections */}
        {[
          {
            num: "1", title: "Acceptance of Terms",
            content: "By accessing or using MoneySSutra, you agree to be bound by these Terms. If you do not agree, you must discontinue use immediately."
          },
          {
            num: "2", title: "Nature of the Service",
            content: null,
            custom: (
              <>
                <p className="text-sm mb-3" style={{ color: "var(--text-secondary)" }}>MoneySSutra is a financial analytics and personal financial management platform that provides:</p>
                <ul className="text-sm space-y-1 mb-3 list-disc pl-5" style={{ color: "var(--text-secondary)" }}>
                  <li>Financial Survival Analysis</li>
                  <li>Financial Control Scoring</li>
                  <li>Behavioral Financial Insights</li>
                  <li>Gamified Financial Tracking</li>
                  <li>Financial Simulation Tools</li>
                </ul>
                <div className="p-3 rounded-xl" style={{ backgroundColor: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.15)" }}>
                  <p className="text-xs font-bold mb-1" style={{ color: "#DC2626" }}>MoneySSutra is NOT:</p>
                  <ul className="text-xs space-y-0.5" style={{ color: "#DC2626" }}>
                    <li>A bank or NBFC</li>
                    <li>A registered investment advisor</li>
                    <li>A provider of financial, legal, tax, or investment advice</li>
                  </ul>
                  <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>All outputs are algorithm-based informational tools. We do not guarantee financial outcomes.</p>
                </div>
              </>
            )
          },
          {
            num: "3", title: "Eligibility",
            content: null,
            custom: (
              <ul className="text-sm space-y-1 list-disc pl-5" style={{ color: "var(--text-secondary)" }}>
                <li>You must be at least 18 years of age</li>
                <li>Provide accurate and complete registration information</li>
                <li>Use the Services for lawful purposes only</li>
                <li>We reserve the right to suspend or terminate accounts violating these Terms</li>
              </ul>
            )
          },
          {
            num: "4", title: "User Responsibilities",
            content: null,
            custom: (
              <ul className="text-sm space-y-1 list-disc pl-5" style={{ color: "var(--text-secondary)" }}>
                <li>Maintain confidentiality of login credentials</li>
                <li>Not to misuse, copy, reverse engineer, or exploit the platform</li>
                <li>Provide accurate financial inputs</li>
                <li>Comply with applicable laws</li>
                <li>You are solely responsible for decisions made using app insights</li>
              </ul>
            )
          },
          {
            num: "5", title: "Data and Privacy",
            content: null,
            custom: (
              <>
                <p className="text-sm mb-2" style={{ color: "var(--text-secondary)" }}>Your use of the Services is subject to our <a href="/privacy-policy" className="underline font-medium" style={{ color: "#3B82F6" }}>Privacy Policy</a>. We may collect personal details, financial input data, and usage analytics.</p>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Future features may request SMS access (Android only, with explicit consent) and bank data via RBI-regulated Account Aggregators. No financial data is accessed without explicit user consent.</p>
              </>
            )
          },
          {
            num: "6", title: "Intellectual Property",
            content: "All intellectual property including financial scoring algorithms, survival calculation models, design, content, branding, and software architecture are owned exclusively by NEXT GENERATION LEADERSHIP PRIVATE LIMITED. Unauthorized reproduction is prohibited."
          },
          {
            num: "7", title: "Limitation of Liability",
            content: null,
            custom: (
              <>
                <p className="text-sm mb-2" style={{ color: "var(--text-secondary)" }}>The Company shall not be liable for financial losses, investment losses, business losses, or indirect or consequential damages.</p>
                <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Use of the Services is at your own risk. Maximum liability shall not exceed fees paid (if any) in the preceding 12 months.</p>
              </>
            )
          },
          {
            num: "8", title: "Service Modifications",
            content: "We reserve the right to modify features, update scoring models, suspend services, and amend these Terms. Continued use after changes constitutes acceptance."
          },
          {
            num: "9", title: "Account Deletion",
            content: null,
            custom: (
              <>
                <p className="text-sm mb-2" style={{ color: "var(--text-secondary)" }}>Users may delete their accounts via:</p>
                <ul className="text-sm space-y-1 list-disc pl-5 mb-2" style={{ color: "var(--text-secondary)" }}>
                  <li>In-app deletion: Profile &rarr; Settings &rarr; Delete Account</li>
                  <li>Email: <span className="font-medium">support@moneyssutra.com</span></li>
                </ul>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Data will be deleted within a reasonable timeframe except where legally required to retain. See our <a href="/data-deletion" className="underline font-medium" style={{ color: "#3B82F6" }}>Data Deletion Policy</a>.</p>
              </>
            )
          },
          {
            num: "10", title: "Governing Law & Jurisdiction",
            content: "These Terms are governed by the laws of India. Jurisdiction shall lie with courts having authority over PIN Code 831004, India."
          },
          {
            num: "11", title: "Contact Information",
            content: null,
            custom: (
              <div className="space-y-1 text-sm" style={{ color: "var(--text-secondary)" }}>
                <p className="font-bold" style={{ color: "var(--text-primary)" }}>NEXT GENERATION LEADERSHIP PRIVATE LIMITED</p>
                <p>Email: support@moneyssutra.com</p>
                <p>Website: <a href="https://www.moneyssutra.com" className="underline" style={{ color: "#3B82F6" }}>www.moneyssutra.com</a></p>
              </div>
            )
          },
        ].map((section) => (
          <div key={section.num} className="rounded-2xl p-4" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(59,130,246,0.1)", color: "#3B82F6" }}>{section.num}</span>
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

export default TermsOfService;
