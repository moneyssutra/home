import { Home, Car, Building2, Briefcase, GraduationCap, CreditCard, MoreHorizontal, Landmark } from "lucide-react";
import CategoryBreakdown from "@/components/CategoryBreakdown";
import { useLoanList } from "@/hooks/useApi";

const loanTypeConfig = {
  "home-loan": { name: "Home Loan", icon: Home, color: "#3B82F6", bgColor: "#DBEAFE" },
  "personal-loan": { name: "Personal Loan", icon: CreditCard, color: "#8B5CF6", bgColor: "#F3E8FF" },
  "vehicle-loan": { name: "Vehicle Loan", icon: Car, color: "#F59E0B", bgColor: "#FEF3C7" },
  "business-loan": { name: "Business Loan", icon: Briefcase, color: "#EC4899", bgColor: "#FCE7F3" },
  "education-loan": { name: "Education Loan", icon: GraduationCap, color: "#14B8A6", bgColor: "#CCFBF1" },
  "property-loan": { name: "Property Loan", icon: Building2, color: "#6366F1", bgColor: "#E0E7FF" },
  "other": { name: "Other", icon: MoreHorizontal, color: "#6B7280", bgColor: "#F3F4F6" },
};

const formatAmount = (amount) => {
  if (!amount) return "0";
  if (amount >= 10000000) return `${(amount / 10000000).toFixed(2)} Cr`;
  if (amount >= 100000) return `${(amount / 100000).toFixed(2)} L`;
  if (amount >= 1000) return `${(amount / 1000).toFixed(1)} K`;
  return new Intl.NumberFormat("en-IN").format(amount);
};

const LoanBreakdown = () => {
  const { data: loans = [], isLoading } = useLoanList();
  const activeLoans = loans.filter(l => (l.outstandingAmount > 0) || l.status === "Active");

  return (
    <CategoryBreakdown
      items={activeLoans}
      typeConfig={loanTypeConfig}
      backPath="/my-loans"
      title="Loan Breakdown"
      summaryGradient="linear-gradient(135deg, #DC2626 0%, #EF4444 100%)"
      summaryLabel="Total Outstanding"
      getTypeSlug={(l) => (l.loanType || "Other").toLowerCase().replace(/\s+/g, "-")}
      getItemValue={(l) => l.outstandingAmount || 0}
      getGroupMeta={(group) => {
        const totalEmi = group.items.reduce((s, l) => s + (l.emiAmount || 0), 0);
        return { subtitle: `\u2022 EMI: \u20b9${formatAmount(totalEmi)}/mo` };
      }}
      emptyIcon={Landmark}
      emptyTitle="No Active Loans"
      emptyColor="#DC2626"
      emptyBgColor="#FEE2E2"
      navigateTo={(slug) => `/loans/${slug}`}
      loading={isLoading}
      extraSummary={[{ label: "Active Loans", value: activeLoans.length }]}
    />
  );
};

export default LoanBreakdown;
