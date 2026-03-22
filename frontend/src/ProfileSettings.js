import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Phone, 
  Camera, 
  Save, 
  Loader2,
  Edit3,
  Calendar,
  Heart,
  Users,
  Briefcase,
  Wallet,
  TrendingUp,
  Target,
  CheckCircle2,
  Building2,
  AlertCircle
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import axios from "axios";
import { toast } from "sonner";
import API_BASE from './utils/apiConfig';

const backendUrl = API_BASE;

const ProfileSettings = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, checkAuth } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const isCompleteProfile = location.state?.completeProfile === true;
  const [isEditing, setIsEditing] = useState(isCompleteProfile);
  const [profile, setProfile] = useState({
    // Top Section
    name: "",
    email: "",
    mobile: "",
    picture: "",
    accountType: "Individual",
    emailVerified: true,
    mobileVerified: false,
    // Basic Info
    dateOfBirth: "",
    maritalStatus: "",
    dependents: 0,
    employmentType: "",
    // Financial Profile
    monthlyIncomeRange: "",
    riskAppetite: "Moderate",
    retirementAge: 60
  });

  const maritalOptions = ["Single", "Married", "Divorced", "Widowed"];
  const employmentOptions = ["Salaried", "Self-Employed", "Business Owner", "Freelancer", "Retired", "Student", "Homemaker"];
  const incomeRanges = [
    "Below ₹25,000",
    "₹25,000 - ₹50,000",
    "₹50,000 - ₹1,00,000",
    "₹1,00,000 - ₹2,50,000",
    "₹2,50,000 - ₹5,00,000",
    "Above ₹5,00,000"
  ];
  const riskOptions = ["Conservative", "Moderate", "Aggressive"];
  const accountTypes = ["Individual", "Company", "HUF", "Trust"];

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await axios.get(`${backendUrl}/api/basic-profile`, {
        withCredentials: true
      });
      const data = response.data;
      setProfile({
        name: data.name || user?.name || "",
        email: user?.email || "",
        mobile: data.mobile || "",
        picture: user?.picture || "",
        accountType: data.accountType || "Individual",
        emailVerified: true,
        mobileVerified: data.mobileVerified || false,
        dateOfBirth: data.dateOfBirth || "",
        maritalStatus: data.maritalStatus || "",
        dependents: data.dependents || 0,
        employmentType: data.employmentType || "",
        monthlyIncomeRange: data.monthlyIncomeRange || "",
        riskAppetite: data.riskAppetite || "Moderate",
        retirementAge: data.retirementAge || 60
      });
    } catch (error) {
      setProfile(prev => ({
        ...prev,
        name: user?.name || "",
        email: user?.email || "",
        picture: user?.picture || ""
      }));
    } finally {
      setLoading(false);
    }
  };

  const validateProfile = () => {
    // DOB validation - cannot be future
    if (profile.dateOfBirth) {
      const dob = new Date(profile.dateOfBirth);
      if (dob > new Date()) {
        toast.error("Date of birth cannot be in the future");
        return false;
      }
    }
    
    // Retirement age validation
    if (profile.dateOfBirth && profile.retirementAge) {
      const dob = new Date(profile.dateOfBirth);
      const currentAge = Math.floor((new Date() - dob) / (365.25 * 24 * 60 * 60 * 1000));
      if (profile.retirementAge <= currentAge) {
        toast.error("Retirement age must be greater than current age");
        return false;
      }
    }
    
    return true;
  };

  const handleSave = async () => {
    if (!validateProfile()) return;
    
    setSaving(true);
    try {
      await axios.put(`${backendUrl}/api/basic-profile`, {
        name: profile.name,
        mobile: profile.mobile,
        accountType: profile.accountType,
        dateOfBirth: profile.dateOfBirth,
        maritalStatus: profile.maritalStatus,
        dependents: profile.dependents,
        employmentType: profile.employmentType,
        monthlyIncomeRange: profile.monthlyIncomeRange,
        riskAppetite: profile.riskAppetite,
        retirementAge: profile.retirementAge
      }, { withCredentials: true });
      toast.success("Profile updated successfully");
      setIsEditing(false);
      checkAuth();
      // Redirect to home if coming from Google signup flow
      if (isCompleteProfile) {
        navigate("/home", { replace: true });
      }
    } catch (error) {
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--bg-app)" }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 rounded-full animate-spin" style={{ borderColor: "var(--brand-primary-soft)", borderTopColor: "var(--brand-primary)" }} />
          <p style={{ color: "var(--text-secondary)" }}>Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32" style={{ backgroundColor: "var(--bg-app)" }} data-testid="profile-settings-page">
      {/* Header */}
      <header className="sticky top-0 z-40 px-4 py-4 flex items-center justify-between" style={{ backgroundColor: "var(--bg-app)" }}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(isCompleteProfile ? "/home" : "/settings", { replace: true })}
            className="flex items-center justify-center w-10 h-10 rounded-full transition-colors hover:bg-gray-100"
            data-testid="back-button"
          >
            <ArrowLeft className="h-5 w-5" style={{ color: "var(--text-primary)" }} />
          </button>
          <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Profile</h1>
        </div>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl transition-colors"
            style={{ backgroundColor: "var(--brand-primary-soft)", color: "var(--brand-primary)" }}
          >
            <Edit3 className="h-4 w-4" />
            Edit
          </button>
        )}
      </header>

      {/* Content */}
      <div className="px-4 py-2 space-y-6">
        {/* Profile Setup Shortcut - Always visible */}
        <button
          onClick={() => navigate("/onboarding")}
          className="w-full rounded-2xl p-4 flex items-center gap-3 active:scale-[0.98] transition-all"
          style={{ background: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)" }}
          data-testid="profile-setup-shortcut"
        >
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <Target className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-white text-sm font-bold">Profile Setup</p>
            <p className="text-white/70 text-xs">Update your financial profile &amp; data</p>
          </div>
          <ArrowLeft className="h-4 w-4 text-white/60 rotate-180" />
        </button>

        {/* Complete Profile Banner for new Google users */}
        {isCompleteProfile && (
          <div className="rounded-2xl p-4 flex items-start gap-3" style={{ backgroundColor: "#DBEAFE", border: "1px solid #93C5FD" }} data-testid="complete-profile-banner">
            <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: "#2563EB" }} />
            <div>
              <p className="text-sm font-bold" style={{ color: "#1E40AF" }}>Complete Your Profile</p>
              <p className="text-xs mt-0.5" style={{ color: "#3B82F6" }}>Add your Date of Birth, Phone Number, and other details for a personalized financial experience.</p>
            </div>
          </div>
        )}
        {/* Top Section - Profile Card */}
        <div className="rounded-2xl p-5 relative" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
          <div className="flex flex-col items-center">
            {/* Profile Picture */}
            <div className="relative mb-4">
              {profile.picture ? (
                <img 
                  src={profile.picture} 
                  alt="Profile" 
                  className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
                />
              ) : (
                <div 
                  className="w-24 h-24 rounded-full flex items-center justify-center border-4 border-white shadow-lg"
                  style={{ backgroundColor: "var(--brand-primary-soft)" }}
                >
                  <User className="h-12 w-12" style={{ color: "var(--brand-primary)" }} />
                </div>
              )}
              {isEditing && (
                <button 
                  className="absolute bottom-0 right-0 w-8 h-8 rounded-full flex items-center justify-center shadow-md"
                  style={{ backgroundColor: "var(--brand-primary)" }}
                >
                  <Camera className="h-4 w-4 text-white" />
                </button>
              )}
            </div>

            {/* Name */}
            {isEditing ? (
              <input
                type="text"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                className="text-xl font-bold text-center bg-transparent border-b-2 outline-none mb-2 w-full max-w-xs"
                style={{ color: "var(--text-primary)", borderColor: "var(--brand-primary)" }}
                placeholder="Your Name"
              />
            ) : (
              <h2 className="text-xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
                {profile.name || "Your Name"}
              </h2>
            )}

            {/* Email with verified badge */}
            <div className="flex items-center gap-2 mb-1">
              <Mail className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
              <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{profile.email}</span>
              {profile.emailVerified && (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              )}
            </div>

            {/* Mobile with verified badge */}
            <div className="flex items-center gap-2 mb-3">
              <Phone className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
              {isEditing ? (
                <input
                  type="tel"
                  value={profile.mobile}
                  onChange={(e) => setProfile({ ...profile, mobile: e.target.value })}
                  className="text-sm bg-transparent border-b outline-none"
                  style={{ color: "var(--text-secondary)", borderColor: "var(--border-light)" }}
                  placeholder="Mobile Number"
                />
              ) : (
                <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  {profile.mobile || "Add mobile"}
                </span>
              )}
              {profile.mobileVerified && profile.mobile && (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              )}
            </div>

            {/* Account Type */}
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
              {isEditing ? (
                <select
                  value={profile.accountType}
                  onChange={(e) => setProfile({ ...profile, accountType: e.target.value })}
                  className="text-sm bg-transparent border-b outline-none py-1"
                  style={{ color: "var(--text-secondary)", borderColor: "var(--border-light)" }}
                >
                  {accountTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              ) : (
                <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: "var(--brand-primary-soft)", color: "var(--brand-primary)" }}>
                  {profile.accountType} Account
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Section 1: Basic Info */}
        <div className="rounded-2xl p-5" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
          <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <User className="h-5 w-5" style={{ color: "var(--brand-primary)" }} />
            Basic Information
          </h3>

          <div className="space-y-4">
            {/* Date of Birth */}
            <div className="flex items-center justify-between py-3 border-b" style={{ borderColor: "var(--border-light)" }}>
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5" style={{ color: "var(--text-muted)" }} />
                <span style={{ color: "var(--text-secondary)" }}>Date of Birth</span>
              </div>
              {isEditing ? (
                <input
                  type="date"
                  value={profile.dateOfBirth}
                  onChange={(e) => setProfile({ ...profile, dateOfBirth: e.target.value })}
                  max={new Date().toISOString().split('T')[0]}
                  className="text-right bg-transparent outline-none"
                  style={{ color: "var(--text-primary)" }}
                />
              ) : (
                <span className="font-medium" style={{ color: "var(--text-primary)" }}>
                  {profile.dateOfBirth ? new Date(profile.dateOfBirth).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : "Not set"}
                </span>
              )}
            </div>

            {/* Marital Status */}
            <div className="flex items-center justify-between py-3 border-b" style={{ borderColor: "var(--border-light)" }}>
              <div className="flex items-center gap-3">
                <Heart className="h-5 w-5" style={{ color: "var(--text-muted)" }} />
                <span style={{ color: "var(--text-secondary)" }}>Marital Status</span>
              </div>
              {isEditing ? (
                <select
                  value={profile.maritalStatus}
                  onChange={(e) => setProfile({ ...profile, maritalStatus: e.target.value })}
                  className="text-right bg-transparent outline-none"
                  style={{ color: "var(--text-primary)" }}
                >
                  <option value="">Select</option>
                  {maritalOptions.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : (
                <span className="font-medium" style={{ color: "var(--text-primary)" }}>
                  {profile.maritalStatus || "Not set"}
                </span>
              )}
            </div>

            {/* Dependents */}
            <div className="flex items-center justify-between py-3 border-b" style={{ borderColor: "var(--border-light)" }}>
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5" style={{ color: "var(--text-muted)" }} />
                <span style={{ color: "var(--text-secondary)" }}>Dependents</span>
              </div>
              {isEditing ? (
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={profile.dependents}
                  onChange={(e) => setProfile({ ...profile, dependents: parseInt(e.target.value) || 0 })}
                  className="text-right bg-transparent outline-none w-16"
                  style={{ color: "var(--text-primary)" }}
                />
              ) : (
                <span className="font-medium" style={{ color: "var(--text-primary)" }}>
                  {profile.dependents} {profile.dependents === 1 ? "person" : "people"}
                </span>
              )}
            </div>

            {/* Employment Type */}
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <Briefcase className="h-5 w-5" style={{ color: "var(--text-muted)" }} />
                <span style={{ color: "var(--text-secondary)" }}>Employment Type</span>
              </div>
              {isEditing ? (
                <select
                  value={profile.employmentType}
                  onChange={(e) => setProfile({ ...profile, employmentType: e.target.value })}
                  className="text-right bg-transparent outline-none"
                  style={{ color: "var(--text-primary)" }}
                >
                  <option value="">Select</option>
                  {employmentOptions.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : (
                <span className="font-medium" style={{ color: "var(--text-primary)" }}>
                  {profile.employmentType || "Not set"}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Section 2: Financial Profile */}
        <div className="rounded-2xl p-5" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
          <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <Wallet className="h-5 w-5" style={{ color: "#8B5CF6" }} />
            Financial Profile
          </h3>

          <div className="space-y-4">
            {/* Monthly Income Range */}
            <div className="flex items-center justify-between py-3 border-b" style={{ borderColor: "var(--border-light)" }}>
              <div className="flex items-center gap-3">
                <TrendingUp className="h-5 w-5" style={{ color: "var(--text-muted)" }} />
                <span style={{ color: "var(--text-secondary)" }}>Monthly Income</span>
              </div>
              {isEditing ? (
                <select
                  value={profile.monthlyIncomeRange}
                  onChange={(e) => setProfile({ ...profile, monthlyIncomeRange: e.target.value })}
                  className="text-right bg-transparent outline-none max-w-[180px]"
                  style={{ color: "var(--text-primary)" }}
                >
                  <option value="">Select Range</option>
                  {incomeRanges.map(range => (
                    <option key={range} value={range}>{range}</option>
                  ))}
                </select>
              ) : (
                <span className="font-medium" style={{ color: "var(--text-primary)" }}>
                  {profile.monthlyIncomeRange || "Not set"}
                </span>
              )}
            </div>

            {/* Risk Appetite */}
            <div className="py-3 border-b" style={{ borderColor: "var(--border-light)" }}>
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="h-5 w-5" style={{ color: "var(--text-muted)" }} />
                <span style={{ color: "var(--text-secondary)" }}>Risk Appetite</span>
              </div>
              {isEditing ? (
                <div className="flex flex-wrap gap-2 ml-8">
                  {riskOptions.map(risk => (
                    <button
                      key={risk}
                      onClick={() => setProfile({ ...profile, riskAppetite: risk })}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${profile.riskAppetite === risk ? 'text-white' : ''}`}
                      style={{ 
                        backgroundColor: profile.riskAppetite === risk 
                          ? (risk === "Conservative" ? "#059669" : risk === "Moderate" ? "#F59E0B" : "#EF4444")
                          : "var(--bg-subtle)",
                        color: profile.riskAppetite === risk ? "white" : "var(--text-secondary)"
                      }}
                    >
                      {risk}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="ml-8">
                  <span 
                    className="px-3 py-1 rounded-full text-xs font-medium text-white"
                    style={{ 
                      backgroundColor: profile.riskAppetite === "Conservative" ? "#059669" 
                        : profile.riskAppetite === "Moderate" ? "#F59E0B" : "#EF4444"
                    }}
                  >
                  {profile.riskAppetite}
                </span>
                </div>
              )}
            </div>

            {/* Retirement Age */}
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <Target className="h-5 w-5" style={{ color: "var(--text-muted)" }} />
                <span style={{ color: "var(--text-secondary)" }}>Retirement Age</span>
              </div>
              {isEditing ? (
                <input
                  type="number"
                  min="30"
                  max="80"
                  value={profile.retirementAge}
                  onChange={(e) => setProfile({ ...profile, retirementAge: parseInt(e.target.value) || 60 })}
                  className="text-right bg-transparent outline-none w-16"
                  style={{ color: "var(--text-primary)" }}
                />
              ) : (
                <span className="font-medium" style={{ color: "var(--text-primary)" }}>
                  {profile.retirementAge} years
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Save Button */}
      {isEditing && (
        <div className="fixed bottom-0 left-0 right-0 p-4" style={{ backgroundColor: "var(--bg-app)", zIndex: 50, paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}>
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-4 rounded-2xl font-semibold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50 active:scale-[0.98]"
            style={{ backgroundColor: "var(--brand-primary)" }}
            data-testid="save-profile-btn"
          >
            {saving ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-5 w-5" />
                Save Changes
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default ProfileSettings;
