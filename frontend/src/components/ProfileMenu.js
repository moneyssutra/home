import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  User, 
  Settings, 
  Shield, 
  Bell, 
  LogOut,
  Palette,
  Database,
  X
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const ProfileMenu = ({ userName, userPicture }) => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setIsOpen(false);
    await logout();
    navigate("/login", { replace: true });
  };

  const menuItems = [
    { 
      id: "profile", 
      label: "Profile", 
      icon: User, 
      color: "#3B82F6",
      onClick: () => { setIsOpen(false); navigate("/settings/profile"); }
    },
    { 
      id: "security", 
      label: "Security", 
      icon: Shield, 
      color: "#059669",
      onClick: () => { setIsOpen(false); navigate("/settings/security"); }
    },
    { 
      id: "notifications", 
      label: "Notifications", 
      icon: Bell, 
      color: "#F59E0B",
      onClick: () => { setIsOpen(false); navigate("/settings/notifications"); }
    },
    { 
      id: "preferences", 
      label: "Preferences", 
      icon: Palette, 
      color: "#8B5CF6",
      onClick: () => { setIsOpen(false); navigate("/settings/preferences"); }
    },
    { 
      id: "data-privacy", 
      label: "Data & Privacy", 
      icon: Database, 
      color: "#06B6D4",
      onClick: () => { setIsOpen(false); navigate("/settings/data-privacy"); }
    },
  ];

  const getInitials = (name) => {
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* Profile Button - Just avatar, no arrow */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-9 h-9 rounded-full overflow-hidden transition-all hover:ring-2 hover:ring-white/30 active:scale-95"
        data-testid="profile-menu-button"
      >
        {userPicture ? (
          <img 
            src={userPicture} 
            alt={userName || "User"} 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-white/20 flex items-center justify-center text-white text-sm font-semibold">
            {getInitials(userName)}
          </div>
        )}
      </button>

      {/* Settings Drawer */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/30 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Drawer */}
          <div 
            className="fixed right-0 top-0 h-full w-80 z-50 animate-in slide-in-from-right duration-300"
            style={{ backgroundColor: "#ffffff" }}
            data-testid="profile-menu-dropdown"
          >
            {/* Drawer Header */}
            <div className="px-5 py-4 flex items-center justify-between" style={{ backgroundColor: "var(--brand-primary)" }}>
              <div className="flex items-center gap-3">
                {userPicture ? (
                  <img 
                    src={userPicture} 
                    alt={userName || "User"} 
                    className="w-12 h-12 rounded-full object-cover border-2 border-white/30"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white text-lg font-semibold">
                    {getInitials(userName)}
                  </div>
                )}
                <div>
                  <p className="font-semibold text-white">{userName || "User"}</p>
                  <p className="text-sm text-white/70">Settings</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20"
              >
                <X className="h-5 w-5 text-white" />
              </button>
            </div>

            {/* Menu Items */}
            <div className="py-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={item.onClick}
                    className="w-full flex items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-gray-50"
                    data-testid={`profile-menu-${item.id}`}
                  >
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: `${item.color}15` }}
                    >
                      <Icon className="h-5 w-5" style={{ color: item.color }} />
                    </div>
                    <span className="text-base font-medium" style={{ color: "#111827" }}>{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Divider */}
            <div className="mx-5 my-2 border-t" style={{ borderColor: "#e5e7eb" }} />

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-red-50"
              data-testid="profile-menu-logout"
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(239, 68, 68, 0.1)" }}>
                <LogOut className="h-5 w-5" style={{ color: "#EF4444" }} />
              </div>
              <span className="text-base font-medium" style={{ color: "#EF4444" }}>Logout</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default ProfileMenu;
