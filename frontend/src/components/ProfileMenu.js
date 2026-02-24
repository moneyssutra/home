import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  User, 
  Settings, 
  Shield, 
  Bell, 
  LogOut,
  ChevronDown
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
      onClick: () => { setIsOpen(false); navigate("/settings/profile"); }
    },
    { 
      id: "settings", 
      label: "Settings", 
      icon: Settings, 
      onClick: () => { setIsOpen(false); navigate("/settings"); }
    },
    { 
      id: "security", 
      label: "Security", 
      icon: Shield, 
      onClick: () => { setIsOpen(false); navigate("/settings/security"); }
    },
    { 
      id: "notifications", 
      label: "Notifications", 
      icon: Bell, 
      onClick: () => { setIsOpen(false); navigate("/settings/notifications"); }
    },
    { 
      id: "logout", 
      label: "Logout", 
      icon: LogOut, 
      onClick: handleLogout,
      danger: true
    },
  ];

  const getInitials = (name) => {
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* Profile Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-full bg-white/10 backdrop-blur-sm text-white transition-all hover:bg-white/20 active:scale-95"
        data-testid="profile-menu-button"
      >
        {userPicture ? (
          <img 
            src={userPicture} 
            alt={userName || "User"} 
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-semibold">
            {getInitials(userName)}
          </div>
        )}
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div 
          className="absolute right-0 top-full mt-2 w-56 rounded-2xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200"
          style={{ 
            backgroundColor: "#ffffff", 
            border: "1px solid #e5e7eb",
            boxShadow: "0 10px 40px rgba(0,0,0,0.15)"
          }}
          data-testid="profile-menu-dropdown"
        >
          {/* User Info Header */}
          <div 
            className="px-4 py-3"
            style={{ 
              borderBottom: "1px solid #e5e7eb",
              backgroundColor: "#f9fafb"
            }}
          >
            <p className="font-semibold text-sm" style={{ color: "#111827" }}>
              {userName || "User"}
            </p>
            <p className="text-xs mt-0.5" style={{ color: "#6b7280" }}>
              Manage your account
            </p>
          </div>

          {/* Menu Items */}
          <div className="py-2" style={{ backgroundColor: "#ffffff" }}>
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={item.onClick}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-gray-100"
                  style={{ 
                    color: item.danger ? "#ef4444" : "#111827",
                    backgroundColor: "#ffffff"
                  }}
                  data-testid={`profile-menu-${item.id}`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-sm font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileMenu;
