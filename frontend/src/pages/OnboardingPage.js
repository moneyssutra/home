import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import StrategicOnboarding from "@/components/StrategicOnboarding";

export default function OnboardingPage() {
  const navigate = useNavigate();

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <div className="h-screen" style={{ backgroundColor: "var(--bg-app)", overscrollBehavior: "none", overflow: "hidden" }}>
      <StrategicOnboarding
        onComplete={() => navigate("/home")}
        onDismiss={() => navigate("/home")}
      />
    </div>
  );
}
