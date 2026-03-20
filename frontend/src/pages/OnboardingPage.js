import { useNavigate } from "react-router-dom";
import ProfileSetup from "@/components/ProfileSetup";

export default function OnboardingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--bg-app)", overscrollBehavior: "none" }}>
      <ProfileSetup
        onComplete={() => navigate("/home")}
        onDismiss={() => navigate("/home")}
      />
    </div>
  );
}
