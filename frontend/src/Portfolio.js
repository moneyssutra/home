import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Building2, LineChart, CreditCard, Shield, Wallet, Landmark } from "lucide-react";
import axios from "axios";
import BottomNav from "@/components/BottomNav";
import AddActionSheet from "@/components/AddActionSheet";
import BackButton from "@/components/BackButton";

const Portfolio = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [data, setData] = useState({
    assets: [],
    investments: [],
    loans: [],
    insurances: [],
    accounts: [],
    creditCards: [],
  });

  const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:8001";

  useEffect(() => {
    fetchPortfolioData();
  }, []);

  const fetchPortfolioData = async () => {
    try {
      setLoading(true);
      const [assets, investments, loans, insurances, accounts, creditCards] = await Promise.all([
        axios.get(`${backendUrl}/api/assets`),
        axios.get(`${backendUrl}/api/investments`),
        axios.get(`${backendUrl}/api/loans`),
        axios.get(`${backendUrl}/api/insurances`),
        axios.get(`${backendUrl}/api/accounts`),
        axios.get(`${backendUrl}/api/credit-cards`),
      ]);
      setData({
        assets: assets.data,
        investments: investments.data,
        loans: loans.data,
        insurances: insurances.data,
        accounts: accounts.data,
        creditCards: creditCards.data,
      });
    } catch (error) {
      console.error("Error fetching portfolio data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount) => {
    if (amount >= 10000000) return `${(amount / 10000000).toFixed(2)} Cr`;
    if (amount >= 100000) return `${(amount / 100000).toFixed(2)} L`;
    if (amount >= 1000) return `${(amount / 1000).toFixed(1)} K`;
    return new Intl.NumberFormat("en-IN").format(amount);
  };

  const totalAssets = data.assets.reduce((sum, a) => sum + (a.currentValue || 0), 0);
  const totalInvestments = data.investments.reduce((sum, i) => sum + (i.currentValue || 0), 0);
  const totalLoans = data.loans.reduce((sum, l) => sum + (l.outstandingAmount || 0), 0);
  const totalCoverage = data.insurances.reduce((sum, i) => sum + (i.coverageAmount || 0), 0);
  const totalCreditCardOutstanding = data.creditCards.reduce((sum, c) => sum + (c.outstandingAmount || 0), 0);
  const totalCreditLimit = data.creditCards.reduce((sum, c) => sum + (c.creditLimit || 0), 0);
  const totalBalance = data.accounts
    .filter(a => a.accountType !== "Credit Card")
    .reduce((sum, a) => sum + (a.currentBalance || 0), 0);

  const sections = [
    {
      title: "Assets",
      icon: Building2,
      color: "from-blue-500 to-indigo-600",
      bgColor: "bg-blue-500/10",
      textColor: "text-blue-600",
      value: totalAssets,
      count: data.assets.length,
      path: "/my-assets",
    },
    {
      title: "Investments",
      icon: LineChart,
      color: "from-violet-500 to-purple-600",
      bgColor: "bg-violet-500/10",
      textColor: "text-violet-600",
      value: totalInvestments,
      count: data.investments.length,
      path: "/my-investments",
    },
    {
      title: "Loans",
      icon: Landmark,
      color: "from-amber-500 to-orange-600",
      bgColor: "bg-amber-500/10",
      textColor: "text-amber-600",
      value: totalLoans,
      count: data.loans.length,
      path: "/my-loans",
      isLiability: true,
    },
    {
      title: "Credit Cards",
      icon: CreditCard,
      color: "from-fuchsia-500 to-pink-600",
      bgColor: "bg-fuchsia-500/10",
      textColor: "text-fuchsia-600",
      value: totalCreditCardOutstanding,
      count: data.creditCards.length,
      path: "/my-credit-cards",
      isLiability: true,
      extra: totalCreditLimit > 0 ? `${((totalCreditCardOutstanding / totalCreditLimit) * 100).toFixed(0)}% used` : null,
    },
    {
      title: "Insurance",
      icon: Shield,
      color: "from-cyan-500 to-blue-600",
      bgColor: "bg-cyan-500/10",
      textColor: "text-cyan-600",
      value: totalCoverage,
      count: data.insurances.length,
      path: "/my-insurance",
      label: "Coverage",
    },
    {
      title: "Accounts",
      icon: Wallet,
      color: "from-emerald-500 to-teal-600",
      bgColor: "bg-emerald-500/10",
      textColor: "text-emerald-600",
      value: totalBalance,
      count: data.accounts.length,
      path: "/my-accounts",
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAF9] pb-24" data-testid="portfolio-page">
      {/* Header */}
      <header className="bg-gradient-to-br from-[#0B3D2E] via-[#134E3E] to-[#0B3D2E] px-6 pt-8 pb-8">
        <h1 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: "'Manrope', sans-serif" }}>
          Portfolio
        </h1>
        <p className="text-white/60 text-sm">Manage your financial assets</p>
      </header>

      {/* Portfolio Sections */}
      <div className="px-6 -mt-4 space-y-3">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <button
              key={section.title}
              onClick={() => navigate(section.path)}
              className="w-full bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-all active:scale-[0.99]"
              data-testid={`portfolio-${section.title.toLowerCase()}`}
            >
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${section.color} flex items-center justify-center shadow-lg`}>
                <Icon className="h-7 w-7 text-white" />
              </div>
              <div className="flex-1 text-left">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-[#0B3D2E]">{section.title}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${section.bgColor} ${section.textColor}`}>
                    {section.count}
                  </span>
                </div>
                <p className={`text-lg font-bold mt-0.5 ${section.isLiability ? "text-rose-500" : "text-[#0B3D2E]"}`}>
                  {section.isLiability && "-"}₹ {formatAmount(section.value)}
                </p>
                {section.label && (
                  <p className="text-xs text-[#0B3D2E]/50">{section.label}</p>
                )}
              </div>
              <ChevronRight className="h-6 w-6 text-[#0B3D2E]/30" />
            </button>
          );
        })}
      </div>

      {/* Net Position */}
      <div className="px-6 mt-6">
        <div className="bg-gradient-to-br from-[#0B3D2E] to-[#134E3E] rounded-2xl p-5">
          <p className="text-white/60 text-sm mb-1">Net Position</p>
          <h2 className="text-2xl font-bold text-white">
            ₹ {formatAmount(totalAssets + totalInvestments + totalBalance - totalLoans)}
          </h2>
          <p className="text-white/40 text-xs mt-1">Assets + Investments + Cash - Liabilities</p>
        </div>
      </div>

      <BottomNav onAddClick={() => setShowAddSheet(true)} />
      <AddActionSheet isOpen={showAddSheet} onClose={() => setShowAddSheet(false)} />
    </div>
  );
};

export default Portfolio;
