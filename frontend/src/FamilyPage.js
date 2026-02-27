import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Users, UserPlus, Copy, Trash2, Crown, ChevronRight, Wallet, TrendingUp, Building, CreditCard, Loader2 } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";
import BackButton from "@/components/BackButton";

const API = process.env.REACT_APP_BACKEND_URL;

const formatAmount = (amount) => {
  if (!amount) return "₹0";
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)} L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)} K`;
  return `₹${new Intl.NumberFormat("en-IN").format(amount)}`;
};

const RELATIONSHIP_COLORS = {
  Self: { bg: "#DBEAFE", text: "#2563EB" },
  Wife: { bg: "#FCE7F3", text: "#DB2777" },
  Husband: { bg: "#DBEAFE", text: "#2563EB" },
  Son: { bg: "#D1FAE5", text: "#059669" },
  Daughter: { bg: "#FDE68A", text: "#D97706" },
  Father: { bg: "#E0E7FF", text: "#4F46E5" },
  Mother: { bg: "#FDE68A", text: "#D97706" },
  Brother: { bg: "#CFFAFE", text: "#0891B2" },
  Sister: { bg: "#FCE7F3", text: "#DB2777" },
  Family: { bg: "#F3E8FF", text: "#7C3AED" },
};

const FamilyPage = () => {
  const navigate = useNavigate();
  const [family, setFamily] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [familyName, setFamilyName] = useState("");
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberName, setMemberName] = useState("");
  const [memberRelation, setMemberRelation] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [showJoin, setShowJoin] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [combinedSummary, setCombinedSummary] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberSummary, setMemberSummary] = useState(null);

  const fetchFamily = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/api/family`, { withCredentials: true });
      setFamily(res.data.family !== undefined ? (res.data.family || null) : res.data);
    } catch {
      setFamily(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCombinedSummary = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/api/family/combined-summary`, { withCredentials: true });
      setCombinedSummary(res.data);
    } catch { /* */ }
  }, []);

  useEffect(() => { fetchFamily(); }, [fetchFamily]);
  useEffect(() => { if (family?.id) fetchCombinedSummary(); }, [family, fetchCombinedSummary]);

  const handleCreateFamily = async () => {
    if (!familyName.trim()) { toast.error("Enter family name"); return; }
    setCreating(true);
    try {
      const res = await axios.post(`${API}/api/family`, { familyName: familyName.trim() }, { withCredentials: true });
      setFamily(res.data);
      toast.success("Family group created!");
      setFamilyName("");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to create");
    } finally { setCreating(false); }
  };

  const handleAddMember = async () => {
    if (!memberName.trim() || !memberRelation) { toast.error("Fill name and relationship"); return; }
    try {
      await axios.post(`${API}/api/family/add-member`, {
        name: memberName.trim(), relationship: memberRelation, email: memberEmail || null
      }, { withCredentials: true });
      toast.success(`${memberName} added!`);
      setShowAddMember(false);
      setMemberName(""); setMemberRelation(""); setMemberEmail("");
      fetchFamily();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to add");
    }
  };

  const handleRemoveMember = async (memberId, name) => {
    try {
      await axios.delete(`${API}/api/family/member/${memberId}`, { withCredentials: true });
      toast.success(`${name} removed`);
      fetchFamily();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to remove");
    }
  };

  const handleJoinFamily = async () => {
    if (!joinCode.trim()) { toast.error("Enter invite code"); return; }
    try {
      const res = await axios.post(`${API}/api/family/join/${joinCode.trim()}`, {}, { withCredentials: true });
      setFamily(res.data.family);
      toast.success(res.data.message);
      setShowJoin(false); setJoinCode("");
      fetchFamily();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Invalid code");
    }
  };

  const copyInviteCode = () => {
    navigator.clipboard.writeText(family?.inviteCode || "");
    toast.success("Invite code copied!");
  };

  const fetchMemberSummary = async (memberId) => {
    try {
      const res = await axios.get(`${API}/api/family/member/${memberId}/summary`, { withCredentials: true });
      setMemberSummary(res.data);
      setSelectedMember(memberId);
    } catch { toast.error("Failed to load member data"); }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--bg-app)" }}>
      <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--brand-primary)" }} />
    </div>
  );

  return (
    <div className="min-h-screen pb-32" style={{ backgroundColor: "var(--bg-app)" }} data-testid="family-page">
      <header className="px-6 pt-8 pb-8" style={{ background: "linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%)" }}>
        <div className="flex items-center gap-4 mb-4">
          <BackButton fallbackPath="/settings" forceNavigate={true} className="bg-white/20 border-white/30 text-white hover:bg-white/30" />
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Manrope', sans-serif" }}>Family Hub</h1>
        </div>
        <p className="text-white/70 text-sm">Track your family's finances together</p>
      </header>

      <div className="px-6 -mt-4 space-y-4">
        {!family ? (
          /* No family - Create or Join */
          <div className="space-y-4">
            <div className="rounded-2xl p-5 shadow-card" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
              <div className="flex items-center gap-3 mb-4">
                <Users className="h-6 w-6" style={{ color: "#7C3AED" }} />
                <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>Create Family Group</h3>
              </div>
              <input
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
                placeholder="e.g., Sharma Family"
                className="w-full rounded-xl px-4 py-3 text-sm mb-3"
                style={{ backgroundColor: "var(--bg-subtle)", border: "1px solid var(--border-light)", color: "var(--text-primary)" }}
                data-testid="family-name-input"
              />
              <button onClick={handleCreateFamily} disabled={creating} className="w-full rounded-xl py-2.5 text-sm font-medium text-white" style={{ backgroundColor: "#7C3AED" }} data-testid="create-family-btn">
                {creating ? "Creating..." : "Create Family"}
              </button>
            </div>

            <div className="text-center text-sm" style={{ color: "var(--text-muted)" }}>or</div>

            {!showJoin ? (
              <button onClick={() => setShowJoin(true)} className="w-full rounded-2xl p-4 shadow-card text-left flex items-center gap-3" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }} data-testid="join-family-btn">
                <UserPlus className="h-5 w-5" style={{ color: "#0891B2" }} />
                <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Join Existing Family with Code</span>
                <ChevronRight className="h-4 w-4 ml-auto" style={{ color: "var(--text-muted)" }} />
              </button>
            ) : (
              <div className="rounded-2xl p-5 shadow-card" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
                <h3 className="font-semibold mb-3" style={{ color: "var(--text-primary)" }}>Join with Invite Code</h3>
                <input value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} placeholder="Enter 8-character code" className="w-full rounded-xl px-4 py-3 text-sm mb-3 uppercase tracking-widest text-center font-mono" style={{ backgroundColor: "var(--bg-subtle)", border: "1px solid var(--border-light)", color: "var(--text-primary)" }} data-testid="join-code-input" />
                <div className="flex gap-2">
                  <button onClick={() => setShowJoin(false)} className="flex-1 rounded-xl py-2.5 text-sm" style={{ border: "1px solid var(--border-light)", color: "var(--text-secondary)" }}>Cancel</button>
                  <button onClick={handleJoinFamily} className="flex-1 rounded-xl py-2.5 text-sm font-medium text-white" style={{ backgroundColor: "#0891B2" }}>Join</button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Family exists */
          <>
            {/* Invite Code */}
            <div className="rounded-2xl p-4 shadow-card flex items-center justify-between" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }} data-testid="invite-code-card">
              <div>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>Invite Code</p>
                <p className="text-lg font-mono font-bold tracking-widest" style={{ color: "#7C3AED" }}>{family.inviteCode}</p>
              </div>
              <button onClick={copyInviteCode} className="p-2 rounded-lg" style={{ backgroundColor: "#F3E8FF" }} data-testid="copy-code-btn">
                <Copy className="h-4 w-4" style={{ color: "#7C3AED" }} />
              </button>
            </div>

            {/* Combined Summary */}
            {combinedSummary && (
              <div className="rounded-2xl p-5 shadow-card" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }} data-testid="combined-summary">
                <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                  <TrendingUp className="h-4 w-4" style={{ color: "#7C3AED" }} />
                  {combinedSummary.familyName} — Combined
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Net Worth", value: combinedSummary.combinedSummary.netWorth, icon: Wallet, color: "#059669" },
                    { label: "Investments", value: combinedSummary.combinedSummary.totalInvestments, icon: TrendingUp, color: "#2563EB" },
                    { label: "Assets", value: combinedSummary.combinedSummary.totalAssets, icon: Building, color: "#7C3AED" },
                    { label: "Total Loans", value: combinedSummary.combinedSummary.totalLoans, icon: CreditCard, color: "#DC2626" },
                  ].map(({ label, value, icon: Icon, color }) => (
                    <div key={label} className="rounded-xl p-3" style={{ backgroundColor: "var(--bg-subtle)" }}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <Icon className="h-3.5 w-3.5" style={{ color }} />
                        <span className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>{label}</span>
                      </div>
                      <p className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>{formatAmount(value)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Members */}
            <div className="rounded-2xl p-5 shadow-card" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>Members ({family.members?.length || 0})</h3>
                <button onClick={() => setShowAddMember(true)} className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg" style={{ backgroundColor: "#F3E8FF", color: "#7C3AED" }} data-testid="add-member-btn">
                  <UserPlus className="h-3.5 w-3.5" /> Add
                </button>
              </div>

              <div className="space-y-2">
                {family.members?.map((member) => {
                  const rc = RELATIONSHIP_COLORS[member.relationship] || RELATIONSHIP_COLORS.Family;
                  const isSelected = selectedMember === member.id;
                  return (
                    <div key={member.id}>
                      <div
                        onClick={() => isSelected ? setSelectedMember(null) : fetchMemberSummary(member.id)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer"
                        style={{ backgroundColor: isSelected ? "var(--brand-primary-soft)" : "var(--bg-subtle)", border: isSelected ? "1px solid var(--brand-primary)" : "1px solid transparent" }}
                        data-testid={`member-${member.id}`}
                      >
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold" style={{ backgroundColor: rc.bg, color: rc.text }}>
                          {member.name.charAt(0)}
                        </div>
                        <div className="flex-1 text-left">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{member.name}</p>
                            {member.role === "owner" && <Crown className="h-3.5 w-3.5" style={{ color: "#D97706" }} />}
                          </div>
                          <p className="text-xs" style={{ color: "var(--text-muted)" }}>{member.relationship}</p>
                        </div>
                        {member.role !== "owner" && (
                          <button onClick={(e) => { e.stopPropagation(); handleRemoveMember(member.id, member.name); }} className="p-1.5 rounded-lg hover:bg-red-50" data-testid={`remove-${member.id}`}>
                            <Trash2 className="h-3.5 w-3.5 text-red-400" />
                          </button>
                        )}
                        <ChevronRight className="h-4 w-4" style={{ color: "var(--text-muted)", transform: isSelected ? "rotate(90deg)" : "rotate(0)", transition: "transform 200ms" }} />
                      </div>

                      {isSelected && memberSummary?.member?.id === member.id && (
                        <div className="mt-2 ml-12 p-3 rounded-xl" style={{ backgroundColor: "var(--bg-subtle)", border: "1px solid var(--border-light)" }}>
                          <div className="grid grid-cols-3 gap-2 text-center">
                            {[
                              { label: "Income", val: memberSummary.summary.counts.income },
                              { label: "Expenses", val: memberSummary.summary.counts.expenses },
                              { label: "Investments", val: memberSummary.summary.counts.investments },
                            ].map(({ label, val }) => (
                              <div key={label}>
                                <p className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>{val}</p>
                                <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{label}</p>
                              </div>
                            ))}
                          </div>
                          <div className="mt-2 pt-2 border-t" style={{ borderColor: "var(--border-light)" }}>
                            <p className="text-xs text-center" style={{ color: "var(--text-muted)" }}>Net Worth: <strong style={{ color: "var(--text-primary)" }}>{formatAmount(memberSummary.summary.netWorth)}</strong></p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Add Member Form */}
            {showAddMember && (
              <div className="rounded-2xl p-5 shadow-card" style={{ backgroundColor: "var(--bg-card)", border: "1px solid #7C3AED" }} data-testid="add-member-form">
                <h3 className="font-semibold mb-3" style={{ color: "var(--text-primary)" }}>Add Family Member</h3>
                <div className="space-y-3">
                  <input value={memberName} onChange={(e) => setMemberName(e.target.value)} placeholder="Name" className="w-full rounded-xl px-4 py-2.5 text-sm" style={{ backgroundColor: "var(--bg-subtle)", border: "1px solid var(--border-light)", color: "var(--text-primary)" }} data-testid="member-name-input" />
                  <select value={memberRelation} onChange={(e) => setMemberRelation(e.target.value)} className="w-full rounded-xl px-4 py-2.5 text-sm" style={{ backgroundColor: "var(--bg-subtle)", border: "1px solid var(--border-light)", color: "var(--text-primary)" }} data-testid="member-relation-select">
                    <option value="">Select Relationship</option>
                    {["Wife", "Husband", "Son", "Daughter", "Father", "Mother", "Brother", "Sister", "Other"].map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <input value={memberEmail} onChange={(e) => setMemberEmail(e.target.value)} placeholder="Email (optional)" type="email" className="w-full rounded-xl px-4 py-2.5 text-sm" style={{ backgroundColor: "var(--bg-subtle)", border: "1px solid var(--border-light)", color: "var(--text-primary)" }} data-testid="member-email-input" />
                  <div className="flex gap-2">
                    <button onClick={() => { setShowAddMember(false); setMemberName(""); setMemberRelation(""); }} className="flex-1 rounded-xl py-2.5 text-sm" style={{ border: "1px solid var(--border-light)", color: "var(--text-secondary)" }}>Cancel</button>
                    <button onClick={handleAddMember} className="flex-1 rounded-xl py-2.5 text-sm font-medium text-white" style={{ backgroundColor: "#7C3AED" }} data-testid="confirm-add-member-btn">Add Member</button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default FamilyPage;
