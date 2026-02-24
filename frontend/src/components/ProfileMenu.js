import { useNavigate } from "react-router-dom";
import { User } from "lucide-react";

const ProfileMenu = ({ userName, userPicture }) => {
  const navigate = useNavigate();

  const getInitials = (name) => {
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <button
      onClick={() => navigate("/settings")}
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
  );
};

export default ProfileMenu;
