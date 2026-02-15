import { useEffect, useCallback } from "react";
import { toast } from "@/components/ui/sonner";
import axios from "axios";
import confetti from "canvas-confetti";

// Milestone celebration messages
const getMilestoneMessage = (milestone, goalName) => {
  switch (milestone) {
    case 25:
      return {
        title: "25% Milestone Reached! 🌱",
        description: `Great start! You're a quarter way to "${goalName}"`,
        icon: "🌱"
      };
    case 50:
      return {
        title: "50% - Halfway There! 🔥",
        description: `Amazing progress! "${goalName}" is half complete!`,
        icon: "🔥"
      };
    case 75:
      return {
        title: "75% - Almost There! 🚀",
        description: `Incredible! Only 25% left for "${goalName}"!`,
        icon: "🚀"
      };
    case 100:
      return {
        title: "100% - Goal Achieved! 🎉",
        description: `Congratulations! You've completed "${goalName}"!`,
        icon: "🎉"
      };
    default:
      return {
        title: "Milestone Reached!",
        description: `You've reached ${milestone}% of "${goalName}"`,
        icon: "⭐"
      };
  }
};

// Confetti celebration for milestones
const triggerCelebration = (milestone) => {
  const colors = {
    25: ["#10B981", "#34D399"], // Green
    50: ["#F59E0B", "#FBBF24"], // Amber
    75: ["#8B5CF6", "#A78BFA"], // Violet
    100: ["#EC4899", "#F472B6", "#10B981", "#FBBF24"] // Multi-color
  };

  const particleCount = milestone === 100 ? 150 : milestone === 75 ? 100 : 50;
  const spread = milestone === 100 ? 100 : 70;

  confetti({
    particleCount,
    spread,
    origin: { y: 0.6 },
    colors: colors[milestone] || ["#7C3AED"]
  });

  if (milestone === 100) {
    // Extra celebration for 100%
    setTimeout(() => {
      confetti({
        particleCount: 50,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: colors[100]
      });
      confetti({
        particleCount: 50,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: colors[100]
      });
    }, 300);
  }
};

// Custom hook for milestone notifications
export const useMilestoneNotification = (goalId, backendUrl) => {
  const checkMilestones = useCallback(async () => {
    if (!goalId) return;
    
    try {
      const response = await axios.get(`${backendUrl}/api/goals/${goalId}/milestones`);
      const { newlyReached, goalName } = response.data;
      
      if (newlyReached && newlyReached.length > 0) {
        // Show toast for each newly reached milestone
        newlyReached.forEach((milestone, index) => {
          const message = getMilestoneMessage(milestone, goalName);
          
          setTimeout(() => {
            toast.success(message.title, {
              description: message.description,
              duration: milestone === 100 ? 6000 : 4000,
              icon: message.icon,
            });
            
            // Trigger celebration animation
            triggerCelebration(milestone);
          }, index * 1500); // Stagger notifications
        });
      }
      
      return response.data;
    } catch (error) {
      console.error("Error checking milestones:", error);
    }
  }, [goalId, backendUrl]);

  return { checkMilestones };
};

// Milestone badge component
export const MilestoneBadge = ({ milestone, reached }) => {
  const styles = {
    25: { bg: reached ? "bg-emerald-100" : "bg-gray-100", text: reached ? "text-emerald-600" : "text-gray-400", icon: "🌱" },
    50: { bg: reached ? "bg-amber-100" : "bg-gray-100", text: reached ? "text-amber-600" : "text-gray-400", icon: "🔥" },
    75: { bg: reached ? "bg-violet-100" : "bg-gray-100", text: reached ? "text-violet-600" : "text-gray-400", icon: "🚀" },
    100: { bg: reached ? "bg-pink-100" : "bg-gray-100", text: reached ? "text-pink-600" : "text-gray-400", icon: "🎉" },
  };

  const style = styles[milestone] || styles[25];

  return (
    <div 
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${style.bg} ${style.text} text-xs font-medium transition-all ${reached ? "scale-100" : "scale-95 opacity-50"}`}
      data-testid={`milestone-badge-${milestone}`}
    >
      <span>{style.icon}</span>
      <span>{milestone}%</span>
    </div>
  );
};

// Milestone progress indicator
export const MilestoneProgress = ({ progress, reachedMilestones = [] }) => {
  const milestones = [25, 50, 75, 100];

  return (
    <div className="flex items-center justify-between gap-2 py-2" data-testid="milestone-progress">
      {milestones.map((milestone) => (
        <MilestoneBadge 
          key={milestone} 
          milestone={milestone} 
          reached={reachedMilestones.includes(milestone) || progress >= milestone} 
        />
      ))}
    </div>
  );
};

export default useMilestoneNotification;
