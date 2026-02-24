import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, User, Mail, Phone, Camera, Save, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import axios from "axios";
import { toast } from "sonner";

const backendUrl = process.env.REACT_APP_BACKEND_URL;

const ProfileSettings = () => {
  const navigate = useNavigate();
  const { user, checkAuth } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    mobile: "",
    picture: ""
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await axios.get(`${backendUrl}/api/basic-profile`, {
        withCredentials: true
      });
      setProfile({
        name: response.data.name || user?.name || "",
        email: user?.email || "",
        mobile: response.data.mobile || "",
        picture: user?.picture || ""
      });
    } catch (error) {
      // Use user data if profile fetch fails
      setProfile({
        name: user?.name || "",
        email: user?.email || "",
        mobile: "",
        picture: user?.picture || ""
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`${backendUrl}/api/basic-profile`, {
        name: profile.name,
        mobile: profile.mobile
      }, { withCredentials: true });
      toast.success("Profile updated successfully");
      checkAuth();
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
    <div className="min-h-screen pb-8" style={{ backgroundColor: "var(--bg-app)" }} data-testid="profile-settings-page">
      {/* Header */}
      <header className="sticky top-0 z-40 px-4 py-4 flex items-center gap-3" style={{ backgroundColor: "var(--bg-app)" }}>
        <button
          onClick={() => navigate("/settings", { replace: true })}
          className="flex items-center justify-center w-10 h-10 rounded-full transition-colors hover:bg-gray-100"
          data-testid="back-button"
        >
          <ArrowLeft className="h-5 w-5" style={{ color: "var(--text-primary)" }} />
        </button>
        <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Profile</h1>
      </header>

      {/* Content */}
      <div className="px-4 py-2 space-y-6">
        {/* Profile Picture */}
        <div className="flex flex-col items-center">
          <div className="relative">
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
            <button 
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full flex items-center justify-center shadow-md"
              style={{ backgroundColor: "var(--brand-primary)" }}
            >
              <Camera className="h-4 w-4 text-white" />
            </button>
          </div>
          <p className="mt-3 text-sm" style={{ color: "var(--text-muted)" }}>Tap to change photo</p>
        </div>

        {/* Form Fields */}
        <div className="space-y-4">
          {/* Name */}
          <div className="rounded-2xl p-4" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
            <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
              Full Name
            </label>
            <div className="flex items-center gap-3">
              <User className="h-5 w-5" style={{ color: "var(--text-muted)" }} />
              <input
                type="text"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                placeholder="Enter your name"
                className="flex-1 bg-transparent outline-none text-base"
                style={{ color: "var(--text-primary)" }}
              />
            </div>
          </div>

          {/* Email */}
          <div className="rounded-2xl p-4" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
            <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
              Email Address
            </label>
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5" style={{ color: "var(--text-muted)" }} />
              <input
                type="email"
                value={profile.email}
                disabled
                className="flex-1 bg-transparent outline-none text-base opacity-60"
                style={{ color: "var(--text-primary)" }}
              />
            </div>
            <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>Email cannot be changed</p>
          </div>

          {/* Mobile */}
          <div className="rounded-2xl p-4" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
            <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
              Mobile Number
            </label>
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5" style={{ color: "var(--text-muted)" }} />
              <input
                type="tel"
                value={profile.mobile}
                onChange={(e) => setProfile({ ...profile, mobile: e.target.value })}
                placeholder="Enter mobile number"
                className="flex-1 bg-transparent outline-none text-base"
                style={{ color: "var(--text-primary)" }}
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-4 rounded-2xl font-semibold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          style={{ backgroundColor: "var(--brand-primary)" }}
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
    </div>
  );
};

export default ProfileSettings;
