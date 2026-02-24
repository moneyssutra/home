import { TrendingUp, Building2, Landmark, PiggyBank, Banknote, MoreHorizontal } from "lucide-react";
import CategoryBreakdown from "@/components/CategoryBreakdown";
import { useInvestmentList } from "@/hooks/useApi";

const investmentTypeConfig = {
  "mutual-fund": { name: "Mutual Fund", icon: TrendingUp, color: "#3B82F6", bgColor: "#DBEAFE" },
  "stocks": { name: "Stocks", icon: Banknote, color: "#8B5CF6", bgColor: "#F3E8FF" },
  "fixed-deposit": { name: "Fixed Deposit", icon: Landmark, color: "#F59E0B", bgColor: "#FEF3C7" },
  "ppf": { name: "PPF", icon: PiggyBank, color: "#16A34A", bgColor: "#DCFCE7" },
  "epf": { name: "EPF", icon: PiggyBank, color: "#14B8A6", bgColor: "#CCFBF1" },
  "nps": { name: "NPS", icon: PiggyBank, color: "#6366F1", bgColor: "#E0E7FF" },
  "real-estate": { name: "Real Estate", icon: Building2, color: "#EC4899", bgColor: "#FCE7F3" },
  "gold": { name: "Gold", icon: Banknote, color: "#F59E0B", bgColor: "#FEF3C7" },
  "bonds": { name: "Bonds", icon: Landmark, color: "#0EA5E9", bgColor: "#E0F2FE" },
  "cryptocurrency": { name: "Cryptocurrency", icon: Banknote, color: "#8B5CF6", bgColor: "#F3E8FF" },
  "other": { name: "Other", icon: MoreHorizontal, color: "#6B7280", bgColor: "#F3F4F6" },
};

const InvestmentBreakdown = () => {
  const { data: investments = [], isLoading } = useInvestmentList();

  return (
    <CategoryBreakdown
      items={investments}
      typeConfig={investmentTypeConfig}
      backPath="/my-investments"
      title="Investment Breakdown"
      summaryGradient="linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)"
      summaryLabel="Total Portfolio Value"
      getTypeSlug={(i) => (i.investmentCategory || i.category || "Other").toLowerCase().replace(/\s+/g, "-")}
      getItemValue={(i) => i.currentValue || 0}
      emptyIcon={TrendingUp}
      emptyTitle="No Investments Yet"
      emptyColor="#8B5CF6"
      emptyBgColor="#F3E8FF"
      navigateTo={(slug) => `/investments/${slug}`}
      loading={isLoading}
    />
  );
};

export default InvestmentBreakdown;
