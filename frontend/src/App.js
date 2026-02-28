import { useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";

// Auth & Context
import { AuthProvider } from "@/context/AuthContext";
import { WorkspaceProvider } from "@/context/WorkspaceContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { FamilyProvider } from "@/context/FamilyContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AuthCallback from "@/components/AuthCallback";
import Login from "@/pages/Login";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";

// Pages
import Dashboard from "@/Dashboard";
import Welcome from "@/Welcome";
import BasicSetup from "@/BasicSetup";
import MyIncome from "@/MyIncome";
import Portfolio from "@/Portfolio";
import WorkspaceSettings from "@/pages/WorkspaceSettings";

// Income Pages
import BusinessIncome from "@/BusinessIncome";
import MyBusiness from "@/MyBusiness";
import JobIncome from "@/JobIncome";
import MyJob from "@/MyJob";
import SelfEmployedIncome from "@/SelfEmployedIncome";
import MySelfEmployed from "@/MySelfEmployed";
import MyInterest from "@/MyInterest";
import MyRental from "@/MyRental";
import CommissionIncome from "@/CommissionIncome";
import MyCommission from "@/MyCommission";
import MyDividend from "@/MyDividend";

// Financial Pages
import LoanForm from "@/LoanForm";
import MyLoans from "@/MyLoans";
import LoanBreakdown from "@/LoanBreakdown";
import CategoryLoan from "@/CategoryLoan";
import AssetForm from "@/AssetForm";
import MyAssets from "@/MyAssets";
import AssetBreakdown from "@/AssetBreakdown";
import CategoryAsset from "@/CategoryAsset";
import AccountForm from "@/AccountForm";
import MyAccounts from "@/MyAccounts";
import ExpenseForm from "@/ExpenseForm";
import MyExpenses from "@/MyExpenses";
import ExpenseBreakdown from "@/ExpenseBreakdown";
import CategoryExpenses from "@/CategoryExpenses";
import FixedExpenses from "@/FixedExpenses";
import VariableExpenses from "@/VariableExpenses";
import ExpenseCalendar from "@/ExpenseCalendar";
import DataImport from "@/DataImport";
import FamilyPage from "@/FamilyPage";
import InsuranceForm from "@/InsuranceForm";
import MyInsurance from "@/MyInsurance";
import InsuranceBreakdown from "@/InsuranceBreakdown";
import CategoryInsurance from "@/CategoryInsurance";
import InvestmentForm from "@/InvestmentForm";
import MyInvestments from "@/MyInvestments";
import InvestmentBreakdown from "@/InvestmentBreakdown";
import CategoryInvestment from "@/CategoryInvestment";
import CreditCardForm from "@/CreditCardForm";
import MyCreditCards from "@/MyCreditCards";
import MyLiabilities from "@/MyLiabilities";

// Goal Pages
import MyGoals from "@/MyGoals";
import GoalForm from "@/GoalForm";
import GoalDetail from "@/GoalDetail";
import GoalAchievements from "@/GoalAchievements";

// Other Income Pages
import MyOtherIncome from "@/MyOtherIncome";
import OtherIncomeForm from "@/OtherIncomeForm";

// Insights & Settings Pages
import Insights from "@/Insights";
import Wealth from "@/Wealth";
import Analytics from "@/Analytics";
import Reports from "@/Reports";
import Settings from "@/Settings";
import ProfileSettings from "@/ProfileSettings";
import SecuritySettings from "@/SecuritySettings";
import NotificationSettings from "@/NotificationSettings";
import PreferencesSettings from "@/PreferencesSettings";
import DataPrivacySettings from "@/DataPrivacySettings";
import TermsOfService from "@/pages/TermsOfService";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import DataDeletion from "@/pages/DataDeletion";

// Cashflow Detail Pages
import IncomeReceived from "@/pages/IncomeReceived";
import ExpectedIncome from "@/pages/ExpectedIncome";
import ExpensesDone from "@/pages/ExpensesDone";
import UpcomingExpenses from "@/pages/UpcomingExpenses";
import AddIncome from "@/pages/AddIncome";

// App Router with session_id detection
function AppRouter() {
  const location = useLocation();
  
  // Check URL fragment for session_id (Google OAuth callback)
  // This synchronous check prevents race conditions
  if (location.hash?.includes('session_id=')) {
    return <AuthCallback />;
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      
      {/* Protected Routes */}
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/home" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/welcome" element={<ProtectedRoute><Welcome /></ProtectedRoute>} />
      <Route path="/setup" element={<ProtectedRoute><BasicSetup /></ProtectedRoute>} />
      
      {/* Navigation Routes */}
      <Route path="/my-income" element={<ProtectedRoute><MyIncome /></ProtectedRoute>} />
      <Route path="/portfolio" element={<ProtectedRoute><Portfolio /></ProtectedRoute>} />
      <Route path="/wealth" element={<ProtectedRoute><Wealth /></ProtectedRoute>} />
      <Route path="/health" element={<ProtectedRoute><Insights /></ProtectedRoute>} />
      
      {/* Cashflow Detail Routes */}
      <Route path="/add-income" element={<ProtectedRoute><AddIncome /></ProtectedRoute>} />
      <Route path="/income-received" element={<ProtectedRoute><IncomeReceived /></ProtectedRoute>} />
      <Route path="/expected-income" element={<ProtectedRoute><ExpectedIncome /></ProtectedRoute>} />
      <Route path="/expenses-done" element={<ProtectedRoute><ExpensesDone /></ProtectedRoute>} />
      <Route path="/upcoming-expenses" element={<ProtectedRoute><UpcomingExpenses /></ProtectedRoute>} />
      
      {/* Business Income */}
      <Route path="/my-business" element={<ProtectedRoute><MyBusiness /></ProtectedRoute>} />
      <Route path="/business-income" element={<ProtectedRoute><BusinessIncome /></ProtectedRoute>} />
      <Route path="/business-income/:id" element={<ProtectedRoute><BusinessIncome /></ProtectedRoute>} />
      
      {/* Job Income */}
      <Route path="/my-job" element={<ProtectedRoute><MyJob /></ProtectedRoute>} />
      <Route path="/job-income" element={<ProtectedRoute><JobIncome /></ProtectedRoute>} />
      <Route path="/job-income/:id" element={<ProtectedRoute><JobIncome /></ProtectedRoute>} />
      
      {/* Self-Employed Income */}
      <Route path="/my-self-employed" element={<ProtectedRoute><MySelfEmployed /></ProtectedRoute>} />
      <Route path="/self-employed-income" element={<ProtectedRoute><SelfEmployedIncome /></ProtectedRoute>} />
      <Route path="/self-employed-income/:id" element={<ProtectedRoute><SelfEmployedIncome /></ProtectedRoute>} />
      
      {/* Interest Income */}
      <Route path="/my-interest" element={<ProtectedRoute><MyInterest /></ProtectedRoute>} />
      
      {/* Rental Income */}
      <Route path="/my-rental" element={<ProtectedRoute><MyRental /></ProtectedRoute>} />
      
      {/* Commission Income */}
      <Route path="/my-commission" element={<ProtectedRoute><MyCommission /></ProtectedRoute>} />
      <Route path="/commission-income" element={<ProtectedRoute><CommissionIncome /></ProtectedRoute>} />
      <Route path="/commission-income/:id" element={<ProtectedRoute><CommissionIncome /></ProtectedRoute>} />
      
      {/* Dividend Income */}
      <Route path="/my-dividend" element={<ProtectedRoute><MyDividend /></ProtectedRoute>} />
      
      {/* Loans */}
      <Route path="/my-loans" element={<ProtectedRoute><MyLoans /></ProtectedRoute>} />
      <Route path="/loan-breakdown" element={<ProtectedRoute><LoanBreakdown /></ProtectedRoute>} />
      <Route path="/loans/:category" element={<ProtectedRoute><CategoryLoan /></ProtectedRoute>} />
      <Route path="/loan" element={<ProtectedRoute><LoanForm /></ProtectedRoute>} />
      <Route path="/loan/:id" element={<ProtectedRoute><LoanForm /></ProtectedRoute>} />
      
      {/* Assets */}
      <Route path="/my-assets" element={<ProtectedRoute><MyAssets /></ProtectedRoute>} />
      <Route path="/asset-breakdown" element={<ProtectedRoute><AssetBreakdown /></ProtectedRoute>} />
      <Route path="/assets/:category" element={<ProtectedRoute><CategoryAsset /></ProtectedRoute>} />
      <Route path="/asset" element={<ProtectedRoute><AssetForm /></ProtectedRoute>} />
      <Route path="/asset/:id" element={<ProtectedRoute><AssetForm /></ProtectedRoute>} />
      
      {/* Accounts */}
      <Route path="/my-accounts" element={<ProtectedRoute><MyAccounts /></ProtectedRoute>} />
      <Route path="/account" element={<ProtectedRoute><AccountForm /></ProtectedRoute>} />
      <Route path="/account/:id" element={<ProtectedRoute><AccountForm /></ProtectedRoute>} />
      
      {/* Expenses */}
      <Route path="/my-expenses" element={<ProtectedRoute><MyExpenses /></ProtectedRoute>} />
      <Route path="/expense-calendar" element={<ProtectedRoute><ExpenseCalendar /></ProtectedRoute>} />
      <Route path="/expense-breakdown" element={<ProtectedRoute><ExpenseBreakdown /></ProtectedRoute>} />
      <Route path="/expenses/:category" element={<ProtectedRoute><CategoryExpenses /></ProtectedRoute>} />
      <Route path="/expenses/fixed" element={<ProtectedRoute><FixedExpenses /></ProtectedRoute>} />
      <Route path="/expenses/variable" element={<ProtectedRoute><VariableExpenses /></ProtectedRoute>} />
      <Route path="/expense" element={<ProtectedRoute><ExpenseForm /></ProtectedRoute>} />
      <Route path="/expense/:id" element={<ProtectedRoute><ExpenseForm /></ProtectedRoute>} />
      
      {/* Insurance */}
      <Route path="/my-insurance" element={<ProtectedRoute><MyInsurance /></ProtectedRoute>} />
      <Route path="/insurance-breakdown" element={<ProtectedRoute><InsuranceBreakdown /></ProtectedRoute>} />
      <Route path="/insurances/:category" element={<ProtectedRoute><CategoryInsurance /></ProtectedRoute>} />
      <Route path="/insurance" element={<ProtectedRoute><InsuranceForm /></ProtectedRoute>} />
      <Route path="/insurance/:id" element={<ProtectedRoute><InsuranceForm /></ProtectedRoute>} />
      
      {/* Investments */}
      <Route path="/my-investments" element={<ProtectedRoute><MyInvestments /></ProtectedRoute>} />
      <Route path="/investment-breakdown" element={<ProtectedRoute><InvestmentBreakdown /></ProtectedRoute>} />
      <Route path="/investments/:category" element={<ProtectedRoute><CategoryInvestment /></ProtectedRoute>} />
      <Route path="/investment" element={<ProtectedRoute><InvestmentForm /></ProtectedRoute>} />
      <Route path="/investment/:id" element={<ProtectedRoute><InvestmentForm /></ProtectedRoute>} />
      
      {/* Credit Cards */}
      <Route path="/my-credit-cards" element={<ProtectedRoute><MyCreditCards /></ProtectedRoute>} />
      <Route path="/credit-card" element={<ProtectedRoute><CreditCardForm /></ProtectedRoute>} />
      <Route path="/credit-card/:id" element={<ProtectedRoute><CreditCardForm /></ProtectedRoute>} />
      
      {/* Liabilities (Combined View) */}
      <Route path="/my-liabilities" element={<ProtectedRoute><MyLiabilities /></ProtectedRoute>} />
      
      {/* Goals */}
      <Route path="/my-goals" element={<ProtectedRoute><MyGoals /></ProtectedRoute>} />
      <Route path="/goal" element={<ProtectedRoute><GoalForm /></ProtectedRoute>} />
      <Route path="/goal/:id" element={<ProtectedRoute><GoalDetail /></ProtectedRoute>} />
      <Route path="/goal/:id/edit" element={<ProtectedRoute><GoalForm /></ProtectedRoute>} />
      <Route path="/goal-achievements" element={<ProtectedRoute><GoalAchievements /></ProtectedRoute>} />
      
      {/* Other Income */}
      <Route path="/my-other-income" element={<ProtectedRoute><MyOtherIncome /></ProtectedRoute>} />
      <Route path="/other-income" element={<ProtectedRoute><OtherIncomeForm /></ProtectedRoute>} />
      <Route path="/other-income/:id" element={<ProtectedRoute><OtherIncomeForm /></ProtectedRoute>} />
      
      {/* Insights & Analytics */}
      <Route path="/insights" element={<ProtectedRoute><Insights /></ProtectedRoute>} />
      <Route path="/insights/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
      <Route path="/insights/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
      
      {/* Settings */}
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/settings/profile" element={<ProtectedRoute><ProfileSettings /></ProtectedRoute>} />
      <Route path="/settings/security" element={<ProtectedRoute><SecuritySettings /></ProtectedRoute>} />
      <Route path="/settings/notifications" element={<ProtectedRoute><NotificationSettings /></ProtectedRoute>} />
      
      {/* Data Import & Family */}
      <Route path="/import-data" element={<ProtectedRoute><DataImport /></ProtectedRoute>} />
      <Route path="/family" element={<ProtectedRoute><FamilyPage /></ProtectedRoute>} />
      <Route path="/settings/preferences" element={<ProtectedRoute><PreferencesSettings /></ProtectedRoute>} />
      <Route path="/settings/data-privacy" element={<ProtectedRoute><DataPrivacySettings /></ProtectedRoute>} />

      {/* Legal Pages (public, no auth required) */}
      <Route path="/terms-of-service" element={<TermsOfService />} />
      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
      <Route path="/data-deletion" element={<DataDeletion />} />
      
      {/* Workspace Settings */}
      <Route path="/workspace-settings" element={<ProtectedRoute><WorkspaceSettings /></ProtectedRoute>} />
    </Routes>
  );
}

function App() {
  useEffect(() => {
    const badge = document.getElementById("emergent-badge");
    if (badge) {
      badge.remove();
    }
  }, []);

  return (
    <div className="App">
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <WorkspaceProvider>
              <FamilyProvider>
                <AppRouter />
                <Toaster />
              </FamilyProvider>
            </WorkspaceProvider>
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </div>
  );
}

export default App;
