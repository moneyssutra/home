import { useNavigate } from "react-router-dom";
import { ArrowLeft, Trash2, Mail, Smartphone, Clock, ShieldCheck, AlertTriangle, Building2 } from "lucide-react";

const DataDeletion = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen pb-12" style={{ backgroundColor: "var(--bg-app)" }} data-testid="data-deletion-page">
      <header className="sticky top-0 z-40 px-4 py-4 flex items-center gap-3" style={{ backgroundColor: "var(--bg-app)", borderBottom: "1px solid var(--border-light)" }}>
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full flex items-center justify-center" data-testid="back-button">
          <ArrowLeft className="h-5 w-5" style={{ color: "var(--text-primary)" }} />
        </button>
        <h1 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Data Deletion Policy</h1>
      </header>

      <div className="px-5 py-6 max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="rounded-2xl p-5" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "rgba(239,68,68,0.1)" }}>
              <Trash2 className="h-5 w-5" style={{ color: "#EF4444" }} />
            </div>
            <div>
              <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>Data Deletion Policy</h2>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Effective Date: 25 February, 2026</p>
            </div>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            <span className="font-bold" style={{ color: "var(--text-primary)" }}>MoneySSutra</span> operated by <span className="font-medium">NEXT GENERATION LEADERSHIP PRIVATE LIMITED</span> respects your right to control your personal data.
          </p>
        </div>

        {/* How to Delete */}
        <div className="rounded-2xl p-5" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
          <h3 className="text-sm font-bold mb-4" style={{ color: "var(--text-primary)" }}>How to Delete Your Account</h3>
          <div className="space-y-3">
            {/* Option 1 */}
            <div className="p-4 rounded-xl" style={{ backgroundColor: "rgba(59,130,246,0.05)", border: "1px solid rgba(59,130,246,0.15)" }}>
              <div className="flex items-center gap-2 mb-2">
                <Smartphone className="h-4 w-4" style={{ color: "#2563EB" }} />
                <span className="text-sm font-bold" style={{ color: "#2563EB" }}>Option 1 - In-App Deletion</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: "rgba(59,130,246,0.08)" }}>
                <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  Profile &rarr; Settings &rarr; Data & Privacy &rarr; <span className="font-bold">Delete Account</span>
                </span>
              </div>
              <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>Follow the confirmation steps to proceed.</p>
            </div>

            {/* Option 2 */}
            <div className="p-4 rounded-xl" style={{ backgroundColor: "rgba(5,150,105,0.05)", border: "1px solid rgba(5,150,105,0.15)" }}>
              <div className="flex items-center gap-2 mb-2">
                <Mail className="h-4 w-4" style={{ color: "#059669" }} />
                <span className="text-sm font-bold" style={{ color: "#059669" }}>Option 2 - Email Request</span>
              </div>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                Send an email to: <span className="font-bold">support@moneyssutra.com</span>
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Subject Line: "Account Deletion Request" — Include your registered email address.</p>
            </div>
          </div>
        </div>

        {/* What Happens */}
        <div className="rounded-2xl p-5" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
          <h3 className="text-sm font-bold mb-3" style={{ color: "var(--text-primary)" }}>What Happens After Deletion?</h3>
          <p className="text-sm mb-3" style={{ color: "var(--text-secondary)" }}>Upon successful verification:</p>
          <div className="space-y-2">
            {[
              { icon: ShieldCheck, text: "Your personal information will be permanently deleted", color: "#059669" },
              { icon: Trash2, text: "Your financial records (income, expenses, assets, liabilities) will be erased", color: "#EF4444" },
              { icon: AlertTriangle, text: "Your login credentials will be invalidated", color: "#D97706" },
              { icon: ShieldCheck, text: "Access to the account will be permanently disabled", color: "#059669" },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-2.5 rounded-lg" style={{ backgroundColor: "var(--bg-subtle, rgba(0,0,0,0.02))" }}>
                <item.icon className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: item.color }} />
                <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Data Retention */}
        <div className="rounded-2xl p-4" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
          <h3 className="text-sm font-bold mb-2" style={{ color: "var(--text-primary)" }}>Data Retention</h3>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>We may retain anonymized analytical data and data required by applicable law. <span className="font-medium">No personal data will be retained after deletion.</span></p>
        </div>

        {/* Processing Time */}
        <div className="rounded-2xl p-4 flex items-center gap-3" style={{ backgroundColor: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.2)" }}>
          <Clock className="h-5 w-5 flex-shrink-0" style={{ color: "#D97706" }} />
          <div>
            <p className="text-sm font-bold" style={{ color: "#D97706" }}>Processing Time</p>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Deletion requests are processed within <span className="font-bold">7-15 business days</span>.</p>
          </div>
        </div>

        {/* Contact */}
        <div className="rounded-2xl p-4" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>For assistance, contact: <span className="font-bold">support@moneyssutra.com</span></p>
        </div>
      </div>
    </div>
  );
};

export default DataDeletion;
