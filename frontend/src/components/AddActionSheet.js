import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { X, Briefcase, Receipt, LineChart, Building2, Landmark, CreditCard, Shield, Wallet, Target } from "lucide-react";

const AddActionSheet = ({ isOpen, onClose }) => {
  const navigate = useNavigate();

  // Lock body scroll when sheet is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [isOpen]);

  const actions = [
    { label: "Add Income", icon: Briefcase, color: "from-emerald-500 to-teal-600", path: "/my-income" },
    { label: "Add Expense", icon: Receipt, color: "from-rose-500 to-pink-600", path: "/expense" },
    { label: "Add Investment", icon: LineChart, color: "from-violet-500 to-purple-600", path: "/investment" },
    { label: "Add Asset", icon: Building2, color: "from-blue-500 to-indigo-600", path: "/asset" },
    { label: "Add Loan", icon: Landmark, color: "from-amber-500 to-orange-600", path: "/loan" },
    { label: "Add Credit Card", icon: CreditCard, color: "from-red-500 to-rose-600", path: "/credit-card" },
    { label: "Add Insurance", icon: Shield, color: "from-cyan-500 to-blue-600", path: "/insurance" },
    { label: "Add Account", icon: Wallet, color: "from-slate-500 to-gray-600", path: "/account" },
    { label: "Add Goal", icon: Target, color: "from-fuchsia-500 to-pink-600", path: "/goal" },
  ];

  const handleAction = (path) => {
    onClose();
    navigate(path);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/40 z-50 animate-in fade-in duration-200"
        onClick={onClose}
        data-testid="add-sheet-backdrop"
      />
      
      {/* Sheet */}
      <div 
        className="fixed bottom-0 left-0 right-0 rounded-t-3xl z-50 animate-in slide-in-from-bottom duration-300 shadow-modal"
        style={{ backgroundColor: "var(--bg-card)" }}
        data-testid="add-action-sheet"
      >
        <div className="max-w-lg mx-auto px-6 pb-24 pt-4">
          {/* Handle */}
          <div className="w-12 h-1.5 rounded-full mx-auto mb-4" style={{ backgroundColor: "var(--border-medium)" }} />
          
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold" style={{ fontFamily: "'Manrope', sans-serif", color: "var(--text-primary)" }}>
              Quick Add
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:opacity-80"
              style={{ backgroundColor: "var(--bg-subtle)", color: "var(--text-muted)" }}
              data-testid="close-sheet"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          {/* Actions Grid */}
          <div className="grid grid-cols-3 gap-4">
            {actions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.label}
                  onClick={() => handleAction(action.path)}
                  className="flex flex-col items-center gap-2 p-4 rounded-2xl transition-all active:scale-95 shadow-card"
                  style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}
                  data-testid={`add-${action.label.toLowerCase().replace(' ', '-')}`}
                >
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center shadow-lg`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-xs font-medium text-center leading-tight" style={{ color: "var(--text-secondary)" }}>
                    {action.label.replace('Add ', '')}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
};

export default AddActionSheet;
