import { Home, Building2, Car, Tractor, Package, Gem, MoreHorizontal } from "lucide-react";
import CategoryBreakdown from "@/components/CategoryBreakdown";
import { useAssetList } from "@/hooks/useApi";

const assetTypeConfig = {
  "residential-property": { name: "Residential Property", icon: Home, color: "#3B82F6", bgColor: "#DBEAFE" },
  "commercial-property": { name: "Commercial Property", icon: Building2, color: "#8B5CF6", bgColor: "#F3E8FF" },
  "vehicle": { name: "Vehicle", icon: Car, color: "#F59E0B", bgColor: "#FEF3C7" },
  "equipment": { name: "Equipment", icon: Tractor, color: "#16A34A", bgColor: "#DCFCE7" },
  "land": { name: "Land", icon: Package, color: "#14B8A6", bgColor: "#CCFBF1" },
  "jewellery": { name: "Jewellery", icon: Gem, color: "#EC4899", bgColor: "#FCE7F3" },
  "other": { name: "Other", icon: MoreHorizontal, color: "#6B7280", bgColor: "#F3F4F6" },
};

const AssetBreakdown = () => {
  const { data: assets = [], isLoading } = useAssetList();

  return (
    <CategoryBreakdown
      items={assets}
      typeConfig={assetTypeConfig}
      backPath="/my-assets"
      title="Asset Breakdown"
      summaryGradient="linear-gradient(135deg, #0EA5E9 0%, #38BDF8 100%)"
      summaryLabel="Total Asset Value"
      getTypeSlug={(a) => (a.assetType || "Other").toLowerCase().replace(/\s+/g, "-")}
      getItemValue={(a) => a.currentValue || 0}
      emptyIcon={Home}
      emptyTitle="No Assets Yet"
      emptyColor="#0EA5E9"
      emptyBgColor="#DBEAFE"
      navigateTo={(slug) => `/assets/${slug}`}
      loading={isLoading}
    />
  );
};

export default AssetBreakdown;
