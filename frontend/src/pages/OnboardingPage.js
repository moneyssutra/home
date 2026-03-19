import { useNavigate } from "react-router-dom";
import OnboardingWizard from "@/components/OnboardingWizard";

export default function OnboardingPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--bg-app)" }}>
      <OnboardingWizard
        onComplete={() => navigate("/home")}
        onDismiss={() => navigate("/home")}
      />
    </div>
  );
}
