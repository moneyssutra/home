import { useEffect, useMemo, useState } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import {
  Banknote,
  Briefcase,
  ChevronLeft,
  Home,
  MoreHorizontal,
  Percent,
  PieChart,
  TrendingUp,
} from "lucide-react";
import BusinessIncome from "@/BusinessIncome";
import MyBusiness from "@/MyBusiness";
import JobIncome from "@/JobIncome";
import MyJob from "@/MyJob";

const HomePlaceholder = () => {
  return (
    <div
      className="min-h-screen honeycomb-bg"
      data-testid="home-placeholder-page"
    />
  );
};

const IncomeSource = () => {
  const navigate = useNavigate();
  const [selected, setSelected] = useState(null);

  const incomeTypes = useMemo(
    () => [
      { id: "business", label: "Business", Icon: Briefcase },
      { id: "job", label: "Job", Icon: Banknote },
      { id: "rental", label: "Rental", Icon: Home },
      { id: "commission", label: "Commission", Icon: Percent },
      { id: "interest", label: "Interest", Icon: TrendingUp },
      { id: "dividend", label: "Dividend", Icon: PieChart },
      { id: "other", label: "Other", Icon: MoreHorizontal },
    ],
    [],
  );

  const handleSelect = (id) => {
    if (id === "business") {
      navigate("/my-business");
    } else if (id === "job") {
      navigate("/my-job");
    } else {
      setSelected((prev) => (prev === id ? null : id));
    }
  };

  return (
    <div
      className="min-h-screen honeycomb-bg text-[#0B3D2E]"
      data-testid="income-source-page"
    >
      <header className="flex items-center px-6 pt-8 pb-6">
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E2E8F0] bg-white text-[#0B3D2E] transition-colors hover:bg-[#F8FAF9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D09C]"
          onClick={() => navigate("/home")}
          aria-label="Back to home"
          data-testid="back-arrow-button"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1
          className="flex-1 text-center text-[32px] font-semibold tracking-tight text-[#0B3D2E]"
          style={{ fontFamily: "'Manrope', sans-serif" }}
          data-testid="income-type-title"
        >
          Income Type
        </h1>
        <div className="h-10 w-10" aria-hidden="true" />
      </header>

      <section
        className="mx-auto grid w-full max-w-[620px] grid-cols-2 gap-4 px-6 pb-8"
        data-testid="income-type-grid"
      >
        {incomeTypes.map(({ id, label, Icon }) => {
          const isSelected = selected === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => handleSelect(id)}
              className={`flex h-32 flex-col items-center justify-center rounded-2xl border border-[#E2E8F0] bg-white shadow-[0_6px_16px_rgba(15,23,42,0.08)] transition-colors transition-shadow hover:bg-[#F8FAF9] hover:shadow-[0_12px_20px_rgba(15,23,42,0.12)] active:scale-95 ${
                isSelected
                  ? "border-[#00D09C] shadow-[0_0_0_1px_#00D09C,0_12px_20px_rgba(0,208,156,0.2)]"
                  : ""
              }`}
              aria-pressed={isSelected}
              data-testid={`income-card-${id}`}
            >
              <Icon
                className={`mb-3 h-12 w-12 ${
                  isSelected ? "text-[#00D09C]" : "text-[#0B3D2E]"
                }`}
              />
              <span
                className="text-[26px] font-medium tracking-wide leading-tight whitespace-nowrap"
                style={{ fontFamily: "'Inter', sans-serif" }}
                data-testid={`income-card-label-${id}`}
              >
                {label}
              </span>
            </button>
          );
        })}
      </section>
    </div>
  );
};

function App() {
  useEffect(() => {
    const badge = document.getElementById("emergent-badge");
    if (badge) {
      badge.remove();
    }
  }, []);

  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<IncomeSource />} />
          <Route path="/home" element={<HomePlaceholder />} />
          <Route path="/my-business" element={<MyBusiness />} />
          <Route path="/business-income" element={<BusinessIncome />} />
          <Route path="/business-income/:id" element={<BusinessIncome />} />
          <Route path="/my-job" element={<MyJob />} />
          <Route path="/job-income" element={<JobIncome />} />
          <Route path="/job-income/:id" element={<JobIncome />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;