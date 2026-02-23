import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Plus, Home, TrendingUp, Clock, CalendarClock, Shield, Zap, Building } from "lucide-react";
import axios from "axios";
import BottomNav from "@/components/BottomNav";
import AddActionSheet from "@/components/AddActionSheet";
import BackButton from "@/components/BackButton";
import { useIncomeList } from "@/hooks/useApi";

const MyRental = () => {
  const navigate = useNavigate();
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const [assets, setAssets] = useState([]);
  
  const { data: rentals = [], isLoading: loading, error } = useIncomeList("Rental");
  const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:8001";

  useEffect(() => {
    axios.get(`${backendUrl}/api/assets`).then(res => setAssets(res.data)).catch(() => {});
  }, []);

  const formatAmount = (amount) => {
    if (amount >= 10000000) return `${(amount / 10000000).toFixed(2)} Cr`;
    if (amount >= 100000) return `${(amount / 100000).toFixed(2)} L`;
    if (amount >= 1000) return `${(amount / 1000).toFixed(1)} K`;
    return new Intl.NumberFormat("en-IN").format(amount);
  };

  const { totalIncome, fixedRentals, variableRentals, fixedTotal, variableTotal } = useMemo(() => {
    const total = rentals.reduce((sum, r) => sum + (r.expectedAmount || 0), 0);
    const fixed = rentals.filter(r => r.incomeType === "fixed" || !r.incomeType);
    const variable = rentals.filter(r => r.incomeType === "variable");
    return {
      totalIncome: total,
      fixedRentals: fixed,
      variableRentals: variable,
      fixedTotal: fixed.reduce((sum, r) => sum + (r.expectedAmount || 0), 0),
      variableTotal: variable.reduce((sum, r) => sum + (r.expectedAmount || 0), 0)
    };
  }, [rentals]);

  const getRentalYield = (rental) => {
    if (!rental.assetId) return null;
    const asset = assets.find(a => a.id === rental.assetId);
    if (!asset || !asset.currentValue) return null;
    const annualRent = rental.expectedAmount * (rental.frequency === "Monthly" ? 12 : rental.frequency === "Quarterly" ? 4 : rental.frequency === "Half-Yearly" ? 2 : 1);
    return (annualRent / asset.currentValue) * 100;
  };

  const getLinkedAsset = (assetId) => assets.find(a => a.id === assetId);

  const getPaymentStatus = (rental) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextDate = getNextPaymentDateObj(rental);
    if (!nextDate) return 'upcoming';
    nextDate.setHours(0, 0, 0, 0);
    if (nextDate < today) return 'received';
    if (nextDate.getTime() === today.getTime()) return 'due-today';
    return 'upcoming';
  };

  const getNextPaymentDateObj = (rental) => {
    const { frequency, selectedDate, selectedMonth, customDate } = rental;
    const today = new Date();
    
    switch (frequency) {
      case "Monthly":
        if (!selectedDate) return null;
        const day = new Date(selectedDate).getDate();
        const nextMonthlyDate = new Date(today.getFullYear(), today.getMonth(), day);
        if (nextMonthlyDate <= today) nextMonthlyDate.setMonth(nextMonthlyDate.getMonth() + 1);
        return nextMonthlyDate;
      case "Yearly":
        if (!selectedMonth || !selectedDate) return null;
        const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const monthIndex = months.indexOf(selectedMonth);
        const yearlyDay = new Date(selectedDate).getDate();
        const nextYearlyDate = new Date(today.getFullYear(), monthIndex, yearlyDay);
        if (nextYearlyDate <= today) nextYearlyDate.setFullYear(nextYearlyDate.getFullYear() + 1);
        return nextYearlyDate;
      case "Others":
        return customDate ? new Date(customDate) : null;
      default:
        return null;
    }
  };

  const formatDate = (date) => {
    if (!date) return "Not set";
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const sortedRentals = [...rentals].sort((a, b) => {
    const statusOrder = { 'upcoming': 0, 'due-today': 1, 'received': 2 };
    return statusOrder[getPaymentStatus(a)] - statusOrder[getPaymentStatus(b)];
  });

  const rentalByFrequency = rentals.reduce((acc, r) => {
    const freq = r.frequency || "Other";
    if (!acc[freq]) acc[freq] = { total: 0, count: 0 };
    acc[freq].total += r.expectedAmount || 0;
    acc[freq].count += 1;
    return acc;
  }, {});

  const sortedFrequencies = Object.entries(rentalByFrequency).sort(([, a], [, b]) => b.total - a.total);

  const getFrequencyIcon = (frequency) => {
    const icons = { "Daily": Clock, "Weekly": CalendarClock, "Monthly": TrendingUp, "Quarterly": TrendingUp, "Half-Yearly": TrendingUp, "Yearly": TrendingUp };
    return icons[frequency] || Home;
  };

  const getFrequencyColor = (frequency) => {
    const colors = {
      "Daily": { bg: "var(--status-success-soft)", text: "var(--status-success)" },
      "Weekly": { bg: "var(--status-info-soft)", text: "var(--status-info)" },
      "Monthly": { bg: "var(--brand-primary-soft)", text: "var(--brand-primary)" },
      "Quarterly": { bg: "#F3E8FF", text: "var(--chart-accent2)" },
      "Half-Yearly": { bg: "#FCE7F3", text: "#DB2777" },
      "Yearly": { bg: "var(--status-warning-soft)", text: "var(--status-warning)" },
    };
    return colors[frequency] || { bg: "var(--bg-subtle)", text: "var(--text-secondary)" };
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'received': return { bg: "var(--status-success-soft)", text: "var(--status-success)", border: "var(--status-success)" };
      case 'due-today': return { bg: "var(--status-warning-soft)", text: "var(--status-warning)", border: "var(--status-warning)" };
      case 'upcoming': return { bg: "var(--status-info-soft)", text: "var(--status-info)", border: "var(--status-info)" };
      default: return { bg: "var(--bg-subtle)", text: "var(--text-secondary)", border: "var(--border-light)" };
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'received': return 'Received';
      case 'due-today': return 'Due Today';
      case 'upcoming': return 'Upcoming';
      default: return '';
    }
  };

  const chartColors = ["#10B981", "#3B82F6", "#8B5CF6", "#F59E0B", "#EC4899", "#06B6D4"];

  const fixedReceivedTotal = fixedRentals.filter(r => getPaymentStatus(r) === 'received').reduce((sum, r) => sum + (r.expectedAmount || 0), 0);
  const fixedPendingTotal = fixedRentals.filter(r => getPaymentStatus(r) !== 'received').reduce((sum, r) => sum + (r.expectedAmount || 0), 0);
  const variableReceivedTotal = variableRentals.filter(r => getPaymentStatus(r) === 'received').reduce((sum, r) => sum + (r.expectedAmount || 0), 0);
  const variablePendingTotal = variableRentals.filter(r => getPaymentStatus(r) !== 'received').reduce((sum, r) => sum + (r.expectedAmount || 0), 0);

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: "var(--bg-app)" }} data-testid="my-rental-page">
      <header className="px-6 pt-8 pb-8" style={{ background: "linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)" }}>
        <div className="flex items-center gap-4 mb-6">
          <BackButton fallbackPath="/my-income" forceNavigate={true} className="bg-white/20 border-white/30 text-white hover:bg-white/30" />
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Manrope', sans-serif" }}>My Rental Income</h1>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20" data-testid="total-income-card">
          <p className="text-white/70 text-sm font-medium mb-1">Total Expected Rent</p>
          <h2 className="text-3xl font-bold text-white">₹ {formatAmount(totalIncome)}</h2>
          <p className="text-white/50 text-xs mt-1">{rentals.length} rental properties</p>
          
          <div className="mt-4 pt-4 border-t border-white/20 grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-white/70 mb-1">Fixed Rent</p>
              <p className="text-white font-medium"><span style={{ color: "#A7F3D0" }}>₹{formatAmount(fixedReceivedTotal)} Received</span></p>
              <p className="text-white font-medium"><span style={{ color: "#FDE68A" }}>₹{formatAmount(fixedPendingTotal)} Pending</span></p>
            </div>
            <div>
              <p className="text-white/70 mb-1">Variable Rent</p>
              <p className="text-white font-medium"><span style={{ color: "#A7F3D0" }}>₹{formatAmount(variableReceivedTotal)} Received</span></p>
              <p className="text-white font-medium"><span style={{ color: "#FDE68A" }}>₹{formatAmount(variablePendingTotal)} Pending</span></p>
            </div>
          </div>
        </div>
      </header>

      {sortedFrequencies.length > 0 && (
        <div className="px-6 -mt-4">
          <div className="rounded-2xl p-5 shadow-card" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
            <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Income by Frequency</h3>
            <div className="space-y-3">
              {sortedFrequencies.slice(0, 5).map(([frequency, data], idx) => {
                const percentage = totalIncome > 0 ? (data.total / totalIncome) * 100 : 0;
                const Icon = getFrequencyIcon(frequency);
                const freqColor = getFrequencyColor(frequency);
                return (
                  <div key={frequency} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: freqColor.bg }}>
                      <Icon className="h-5 w-5" style={{ color: freqColor.text }} />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{frequency}</span>
                        <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>₹ {formatAmount(data.total)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--bg-subtle)" }}>
                          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${percentage}%`, backgroundColor: chartColors[idx % chartColors.length] }} />
                        </div>
                        <span className="text-xs w-12 text-right" style={{ color: "var(--text-muted)" }}>{percentage.toFixed(0)}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {rentals.length > 0 && (
        <div className="px-6 mt-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl p-4 shadow-card" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "var(--bg-subtle)" }}>
                  <Shield className="h-4 w-4" style={{ color: "var(--text-secondary)" }} />
                </div>
                <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Fixed</span>
              </div>
              <p className="text-xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>₹ {formatAmount(fixedTotal)}</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>{fixedRentals.length} properties</p>
              <div className="mt-2 space-y-1">
                {fixedRentals.slice(0, 3).map(r => (
                  <div key={r.id} className="flex justify-between text-xs">
                    <span className="truncate flex-1" style={{ color: "var(--text-muted)" }}>{r.name}</span>
                    <span className="font-medium ml-2" style={{ color: "var(--text-primary)" }}>₹{formatAmount(r.expectedAmount)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl p-4 shadow-card" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "var(--status-warning-soft)" }}>
                  <Zap className="h-4 w-4" style={{ color: "var(--status-warning)" }} />
                </div>
                <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Variable</span>
              </div>
              <p className="text-xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>₹ {formatAmount(variableTotal)}</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>{variableRentals.length} properties</p>
              <div className="mt-2 space-y-1">
                {variableRentals.slice(0, 3).map(r => (
                  <div key={r.id} className="flex justify-between text-xs">
                    <span className="truncate flex-1" style={{ color: "var(--text-muted)" }}>{r.name}</span>
                    <span className="font-medium ml-2" style={{ color: "var(--text-primary)" }}>₹{formatAmount(r.expectedAmount)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="px-6 mt-6">
        <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>All Properties</h3>
        
        {loading ? (
          <div className="flex items-center justify-center py-12"><div style={{ color: "var(--text-muted)" }}>Loading...</div></div>
        ) : rentals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-full mb-4" style={{ backgroundColor: "var(--status-warning-soft)" }}>
              <Home className="h-10 w-10" style={{ color: "var(--status-warning)" }} />
            </div>
            <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--text-primary)" }}>No Rentals Added Yet</h2>
            <p className="text-center text-sm mb-6" style={{ color: "var(--text-secondary)" }}>Start by adding your rental income</p>
            <button onClick={() => navigate("/rental-income")} className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-white font-medium" style={{ backgroundColor: "var(--brand-primary)" }} data-testid="add-rental-empty-button">
              <Plus className="h-5 w-5" />Add Rental
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedRentals.map((rental) => {
              const status = getPaymentStatus(rental);
              const Icon = getFrequencyIcon(rental.frequency);
              const freqColor = getFrequencyColor(rental.frequency);
              const statusColor = getStatusColor(status);
              const nextDate = getNextPaymentDateObj(rental);
              const formattedNextDate = formatDate(nextDate);
              const linkedAsset = getLinkedAsset(rental.assetId);
              const rentalYield = getRentalYield(rental);
              
              return (
                <button key={rental.id} onClick={() => navigate(`/rental-income/${rental.id}`)} className="w-full flex items-center gap-3 p-4 rounded-xl transition-all hover:shadow-md shadow-card" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)", opacity: status === 'received' ? 0.7 : 1 }} data-testid={`rental-card-${rental.id}`}>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: freqColor.bg }}>
                    <Icon className="h-6 w-6" style={{ color: freqColor.text }} />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <h3 className="font-semibold truncate" style={{ color: "var(--text-primary)" }}>{rental.name}</h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap" style={{ backgroundColor: statusColor.bg, color: statusColor.text, border: `1px solid ${statusColor.border}` }}>{getStatusLabel(status)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs flex-wrap" style={{ color: "var(--text-muted)" }}>
                      <span>{rental.frequency}</span><span>•</span><span>{rental.incomeType === "variable" ? "Variable" : "Fixed"}</span>
                      {linkedAsset && (<><span>•</span><span className="truncate max-w-[60px]">{linkedAsset.name}</span></>)}
                      {rentalYield && (<><span>•</span><span className="font-medium" style={{ color: "var(--status-success)" }}>{rentalYield.toFixed(1)}% yield</span></>)}
                      {formattedNextDate && rental.incomeType !== "variable" && (<><span>•</span><span className="font-medium" style={{ color: "var(--status-warning)" }}>Next: {formattedNextDate}</span></>)}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <p className="font-bold" style={{ color: status === 'received' ? "var(--status-success)" : "var(--text-primary)" }}>₹ {formatAmount(rental.expectedAmount)}</p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>{rental.frequency}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {rentals.length > 0 && (
        <div className="px-6 mt-6">
          <button onClick={() => navigate("/rental-income")} className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed py-3 font-medium" style={{ borderColor: "var(--brand-primary)", color: "var(--brand-primary)" }} data-testid="add-rental-button">
            <Plus className="h-5 w-5" />Add New Rental
          </button>
        </div>
      )}

      <BottomNav onAddClick={() => setShowAddSheet(true)} />
      <AddActionSheet isOpen={showAddSheet} onClose={() => setShowAddSheet(false)} />
    </div>
  );
};

export default MyRental;
