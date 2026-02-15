import { useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Pages
import Dashboard from "@/Dashboard";
import Welcome from "@/Welcome";
import BasicSetup from "@/BasicSetup";
import MyIncome from "@/MyIncome";
import Portfolio from "@/Portfolio";

// Income Pages
import BusinessIncome from "@/BusinessIncome";
import MyBusiness from "@/MyBusiness";
import JobIncome from "@/JobIncome";
import MyJob from "@/MyJob";
import InterestIncome from "@/InterestIncome";
import MyInterest from "@/MyInterest";
import RentalIncome from "@/RentalIncome";
import MyRental from "@/MyRental";
import CommissionIncome from "@/CommissionIncome";
import MyCommission from "@/MyCommission";
import DividendIncome from "@/DividendIncome";
import MyDividend from "@/MyDividend";

// Financial Pages
import LoanForm from "@/LoanForm";
import MyLoans from "@/MyLoans";
import AssetForm from "@/AssetForm";
import MyAssets from "@/MyAssets";
import AccountForm from "@/AccountForm";
import MyAccounts from "@/MyAccounts";
import ExpenseForm from "@/ExpenseForm";
import MyExpenses from "@/MyExpenses";
import FixedExpenses from "@/FixedExpenses";
import VariableExpenses from "@/VariableExpenses";
import InsuranceForm from "@/InsuranceForm";
import MyInsurance from "@/MyInsurance";
import InvestmentForm from "@/InvestmentForm";
import MyInvestments from "@/MyInvestments";
import CreditCardForm from "@/CreditCardForm";
import MyCreditCards from "@/MyCreditCards";

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
          {/* Main Routes */}
          <Route path="/" element={<Dashboard />} />
          <Route path="/welcome" element={<Welcome />} />
          <Route path="/setup" element={<BasicSetup />} />
          
          {/* Navigation Routes */}
          <Route path="/my-income" element={<MyIncome />} />
          <Route path="/portfolio" element={<Portfolio />} />
          
          {/* Business Income */}
          <Route path="/my-business" element={<MyBusiness />} />
          <Route path="/business-income" element={<BusinessIncome />} />
          <Route path="/business-income/:id" element={<BusinessIncome />} />
          
          {/* Job Income */}
          <Route path="/my-job" element={<MyJob />} />
          <Route path="/job-income" element={<JobIncome />} />
          <Route path="/job-income/:id" element={<JobIncome />} />
          
          {/* Interest Income */}
          <Route path="/my-interest" element={<MyInterest />} />
          <Route path="/interest-income" element={<InterestIncome />} />
          <Route path="/interest-income/:id" element={<InterestIncome />} />
          
          {/* Rental Income */}
          <Route path="/my-rental" element={<MyRental />} />
          <Route path="/rental-income" element={<RentalIncome />} />
          <Route path="/rental-income/:id" element={<RentalIncome />} />
          
          {/* Commission Income */}
          <Route path="/my-commission" element={<MyCommission />} />
          <Route path="/commission-income" element={<CommissionIncome />} />
          <Route path="/commission-income/:id" element={<CommissionIncome />} />
          
          {/* Dividend Income */}
          <Route path="/my-dividend" element={<MyDividend />} />
          <Route path="/dividend-income" element={<DividendIncome />} />
          <Route path="/dividend-income/:id" element={<DividendIncome />} />
          
          {/* Loans */}
          <Route path="/my-loans" element={<MyLoans />} />
          <Route path="/loan" element={<LoanForm />} />
          <Route path="/loan/:id" element={<LoanForm />} />
          
          {/* Assets */}
          <Route path="/my-assets" element={<MyAssets />} />
          <Route path="/asset" element={<AssetForm />} />
          <Route path="/asset/:id" element={<AssetForm />} />
          
          {/* Accounts */}
          <Route path="/my-accounts" element={<MyAccounts />} />
          <Route path="/account" element={<AccountForm />} />
          <Route path="/account/:id" element={<AccountForm />} />
          
          {/* Expenses */}
          <Route path="/my-expenses" element={<MyExpenses />} />
          <Route path="/expenses/fixed" element={<FixedExpenses />} />
          <Route path="/expenses/variable" element={<VariableExpenses />} />
          <Route path="/expense" element={<ExpenseForm />} />
          <Route path="/expense/:id" element={<ExpenseForm />} />
          
          {/* Insurance */}
          <Route path="/my-insurance" element={<MyInsurance />} />
          <Route path="/insurance" element={<InsuranceForm />} />
          <Route path="/insurance/:id" element={<InsuranceForm />} />
          
          {/* Investments */}
          <Route path="/my-investments" element={<MyInvestments />} />
          <Route path="/investment" element={<InvestmentForm />} />
          <Route path="/investment/:id" element={<InvestmentForm />} />
          
          {/* Credit Cards */}
          <Route path="/my-credit-cards" element={<MyCreditCards />} />
          <Route path="/credit-card" element={<CreditCardForm />} />
          <Route path="/credit-card/:id" element={<CreditCardForm />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
