import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

const BackButton = ({ fallbackPath = "/", className = "", forceNavigate = false }) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (forceNavigate) {
      navigate(fallbackPath);
      return;
    }
    
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate(fallbackPath);
    }
  };

  return (
    <button
      type="button"
      className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${className}`}
      style={{ 
        backgroundColor: "var(--bg-card)", 
        border: "1px solid var(--border-light)",
        color: "var(--text-primary)"
      }}
      onClick={handleBack}
      data-testid="back-button"
    >
      <ChevronLeft className="h-5 w-5" />
    </button>
  );
};

export default BackButton;
