import { Shield, Heart, Car, Home, Briefcase, Package, Plane, MoreHorizontal } from "lucide-react";
import CategoryBreakdown from "@/components/CategoryBreakdown";
import { useInsuranceList } from "@/hooks/useApi";

const formatAmount = (amount) => {
  if (!amount) return "0";
  if (amount >= 10000000) return `${(amount / 10000000).toFixed(2)} Cr`;
  if (amount >= 100000) return `${(amount / 100000).toFixed(2)} L`;
  if (amount >= 1000) return `${(amount / 1000).toFixed(1)} K`;
  return new Intl.NumberFormat("en-IN").format(amount);
};

const insuranceTypeConfig = {
  "life-insurance": { name: "Life Insurance", icon: Shield, color: "#16A34A", bgColor: "#DCFCE7" },
  "health-insurance": { name: "Health Insurance", icon: Heart, color: "#3B82F6", bgColor: "#DBEAFE" },
  "vehicle-insurance": { name: "Vehicle Insurance", icon: Car, color: "#F59E0B", bgColor: "#FEF3C7" },
  "property-insurance": { name: "Property Insurance", icon: Home, color: "#8B5CF6", bgColor: "#F3E8FF" },
  "business-insurance": { name: "Business Insurance", icon: Briefcase, color: "#EC4899", bgColor: "#FCE7F3" },
  "general-insurance": { name: "General Insurance", icon: Package, color: "#14B8A6", bgColor: "#CCFBF1" },
  "travel-insurance": { name: "Travel Insurance", icon: Plane, color: "#0EA5E9", bgColor: "#E0F2FE" },
  "other": { name: "Other", icon: MoreHorizontal, color: "#6B7280", bgColor: "#F3F4F6" },
};

const InsuranceBreakdown = () => {
  const { data: insurances = [], isLoading } = useInsuranceList();
  const totalPremium = insurances.reduce((s, i) => s + (i.premiumAmount || 0), 0);

  return (
    <CategoryBreakdown
      items={insurances}
      typeConfig={insuranceTypeConfig}
      backPath="/my-insurance"
      title="Insurance Breakdown"
      summaryGradient="linear-gradient(135deg, #16A34A 0%, #22C55E 100%)"
      summaryLabel="Total Sum Assured"
      getTypeSlug={(i) => (i.insuranceType || "Other").toLowerCase().replace(/\s+/g, "-")}
      getItemValue={(i) => i.sumAssured || 0}
      getGroupMeta={(group) => {
        const premium = group.items.reduce((s, i) => s + (i.premiumAmount || 0), 0);
        return { subtitle: `\u2022 Premium: \u20b9${formatAmount(premium)}/yr` };
      }}
      emptyIcon={Shield}
      emptyTitle="No Insurance Policies"
      emptyColor="#16A34A"
      emptyBgColor="#DCFCE7"
      navigateTo={(slug) => `/insurance/${slug}`}
      loading={isLoading}
      extraSummary={[{ label: "Annual Premium", value: `\u20b9${formatAmount(totalPremium)}` }]}
    />
  );
};

export default InsuranceBreakdown;
