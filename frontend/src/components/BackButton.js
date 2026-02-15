import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

const BackButton = ({ fallbackPath = "/", className = "", forceNavigate = false }) => {
  const navigate = useNavigate();

  const handleBack = () => {
    // If forceNavigate is true, always go to fallbackPath (used for main module pages)
    if (forceNavigate) {
      navigate(fallbackPath);
      return;
    }
    
    // Otherwise, check if there's history to go back to
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate(fallbackPath);
    }
  };

  return (
    <button
      type="button"
      className={`flex h-10 w-10 items-center justify-center rounded-full border border-[#E2E8F0] bg-white text-[#0B3D2E] transition-colors hover:bg-[#F8FAF9] ${className}`}
      onClick={handleBack}
      data-testid="back-button"
    >
      <ChevronLeft className="h-5 w-5" />
    </button>
  );
};

export default BackButton;
