import { useNavigate } from "react-router-dom";
import { ArrowLeft, Home, Building2, MapPin, Car, Coins, Gem, Diamond, Briefcase, Wrench, Layers } from "lucide-react";

const assetTypes = [
  { key: "Residential Property", label: "Residential Property", desc: "House, flat, apartment", icon: Home, color: "#3B82F6", bg: "#EFF6FF" },
  { key: "Commercial Property", label: "Commercial Property", desc: "Office, shop, warehouse", icon: Building2, color: "#7C3AED", bg: "#F5F3FF" },
  { key: "Land", label: "Land", desc: "Plot, agricultural land", icon: MapPin, color: "#059669", bg: "#ECFDF5" },
  { key: "Vehicle", label: "Vehicle", desc: "Car, bike, scooter", icon: Car, color: "#D97706", bg: "#FEF3C7" },
  { key: "Physical Gold", label: "Physical Gold", desc: "Gold jewellery, coins, bars", icon: Coins, color: "#CA8A04", bg: "#FEF9C3" },
  { key: "Physical Silver", label: "Physical Silver", desc: "Silver coins, utensils", icon: Gem, color: "#64748B", bg: "#F1F5F9" },
  { key: "Diamonds", label: "Diamonds", desc: "Diamond jewellery, stones", icon: Diamond, color: "#EC4899", bg: "#FDF2F8" },
  { key: "Business Asset", label: "Business Asset", desc: "Business-related assets", icon: Briefcase, color: "#0891B2", bg: "#ECFEFF" },
  { key: "Equipment / Machinery", label: "Equipment / Machinery", desc: "Tools, machinery, equipment", icon: Wrench, color: "#EA580C", bg: "#FFF7ED" },
  { key: "Other", label: "Other", desc: "Any other asset", icon: Layers, color: "#475569", bg: "#F1F5F9" },
];

const AddAsset = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen pb-8" style={{ backgroundColor: "var(--bg-app)" }} data-testid="add-asset-page">
      <header className="px-6 pt-6 pb-4">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate("/my-assets")} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }} data-testid="back-btn">
            <ArrowLeft className="h-4 w-4" style={{ color: "var(--text-primary)" }} />
          </button>
          <div>
            <h1 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Add Asset</h1>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Select asset type to continue</p>
          </div>
        </div>
      </header>

      <div className="px-6 space-y-3">
        {assetTypes.map((type) => {
          const Icon = type.icon;
          return (
            <button
              key={type.key}
              onClick={() => navigate(`/asset?type=${encodeURIComponent(type.key)}`)}
              className="w-full rounded-xl p-4 flex items-center gap-4 text-left transition-all active:scale-[0.98] hover:shadow-md"
              style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}
              data-testid={`asset-type-${type.key.toLowerCase().replace(/[\s/]+/g, '-')}`}
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: type.bg }}>
                <Icon className="h-6 w-6" style={{ color: type.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{type.label}</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>{type.desc}</p>
              </div>
              <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: "var(--bg-subtle)" }}>
                <ArrowLeft className="h-3 w-3 rotate-180" style={{ color: "var(--text-muted)" }} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default AddAsset;
