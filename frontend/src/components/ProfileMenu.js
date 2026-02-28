import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Settings, LogOut, User, ChevronDown } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const ProfileMenu = ({ userName: propName, userPicture: propPicture }) => {
  const navigate = useNavigate();
  const { logout, user, profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  // Use props if provided, fallback to auth context
  const resolvedName = propName || user?.name || profile?.fullName || null;
  const resolvedPicture = propPicture || user?.picture || null;

  const getInitials = (name) => {
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

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
    navigate("/login");
  };

  const handleSettings = () => {
    setIsOpen(false);
    navigate("/settings");
  };

  return (
    <div className="relative" ref={menuRef} style={{ zIndex: 100 }}>
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

      {/* Dropdown Menu */}
      {isOpen && (
        <div 
          className="absolute left-0 top-12 w-48 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
          style={{ 
            backgroundColor: "#FFFFFF", 
            border: "1px solid #E5E7EB",
            zIndex: 9999,
            boxShadow: "0 10px 40px rgba(0,0,0,0.15)"
          }}
          data-testid="profile-dropdown"
        >
          {/* User Info Header */}
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {userName || "User"}
            </p>
            <p className="text-xs text-gray-500 truncate">
              Manage your account
            </p>
          </div>

          {/* Menu Items */}
          <div className="py-1">
            <button
              onClick={handleSettings}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
              data-testid="settings-menu-item"
            >
              <Settings className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-700">Settings</span>
            </button>

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 transition-colors"
              data-testid="logout-menu-item"
            >
              <LogOut className="h-4 w-4 text-red-500" />
              <span className="text-sm text-red-600 font-medium">Logout</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileMenu;
