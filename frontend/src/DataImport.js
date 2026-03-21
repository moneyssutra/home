import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Download, Upload, FileSpreadsheet, Check, AlertCircle, Loader2 } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";
import AddActionSheet from "@/components/AddActionSheet";
import BackButton from "@/components/BackButton";

const API = process.env.REACT_APP_BACKEND_URL;

const DataImport = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [results, setResults] = useState(null);

  const handleDownloadTemplate = async () => {
    try {
      const response = await axios.get(`${API}/api/data/sample-excel`, {
        withCredentials: true,
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "MoneySSutra_Import_Template.xlsx");
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Template downloaded!");
    } catch {
      toast.error("Failed to download template");
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      toast.error("Please upload an Excel file (.xlsx)");
      return;
    }

    setUploading(true);
    setResults(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await axios.post(`${API}/api/data/import-excel`, formData, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResults(res.data.results);
      const total = Object.values(res.data.results).reduce((s, r) => s + r.created, 0);
      toast.success(`Imported ${total} records successfully!`);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Import failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const totalCreated = results ? Object.values(results).reduce((s, r) => s + r.created, 0) : 0;
  const totalErrors = results ? Object.values(results).reduce((s, r) => s + r.errors.length, 0) : 0;

  return (
    <div className="min-h-screen pb-32" style={{ backgroundColor: "var(--bg-app)" }} data-testid="data-import-page">
      <header className="px-6 pt-8 pb-8" style={{ background: "linear-gradient(135deg, #0F766E 0%, #14B8A6 100%)" }}>
        <div className="flex items-center gap-4 mb-5">
          <BackButton fallbackPath="/settings" forceNavigate={true} className="bg-white/20 border-white/30 text-white hover:bg-white/30" />
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Manrope', sans-serif" }}>
            Import Data
          </h1>
        </div>
        <p className="text-white/70 text-sm">
          Bulk import your financial data using our Excel template. Download the sample, fill in your data, and upload.
        </p>
      </header>

      <div className="px-6 -mt-4 space-y-4">
        {/* Step 1: Download Template */}
        <div className="rounded-2xl p-5 shadow-card" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#E0F2FE" }}>
              <span className="text-lg font-bold" style={{ color: "#0284C7" }}>1</span>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-1" style={{ color: "var(--text-primary)" }}>Download Template</h3>
              <p className="text-sm mb-3" style={{ color: "var(--text-muted)" }}>
                Get our pre-formatted Excel with 9 sheets: Income, Expenses, Investments, Assets, Loans, Credit Cards, Insurance, Accounts, Goals
              </p>
              <button
                onClick={handleDownloadTemplate}
                className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white transition-all active:scale-[0.98]"
                style={{ backgroundColor: "#0284C7" }}
                data-testid="download-template-btn"
              >
                <Download className="h-4 w-4" />
                Download Sample Excel
              </button>
            </div>
          </div>
        </div>

        {/* Step 2: Fill Data */}
        <div className="rounded-2xl p-5 shadow-card" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#FEF3C7" }}>
              <span className="text-lg font-bold" style={{ color: "#D97706" }}>2</span>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-1" style={{ color: "var(--text-primary)" }}>Fill Your Data</h3>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                Each sheet has example rows (green) and column headers. Replace examples with your data. Valid values are listed at the top of each sheet.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {["Income", "Expenses", "Investments", "Assets", "Loans", "Credit Cards", "Insurance", "Accounts", "Goals"].map(s => (
                  <span key={s} className="text-[10px] px-2 py-1 rounded-full font-medium" style={{ backgroundColor: "var(--bg-subtle)", color: "var(--text-secondary)" }}>{s}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Step 3: Upload */}
        <div className="rounded-2xl p-5 shadow-card" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#D1FAE5" }}>
              <span className="text-lg font-bold" style={{ color: "#059669" }}>3</span>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-1" style={{ color: "var(--text-primary)" }}>Upload & Import</h3>
              <p className="text-sm mb-3" style={{ color: "var(--text-muted)" }}>
                Upload your filled Excel file. Data will be imported into your account instantly.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
                data-testid="file-input"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white transition-all active:scale-[0.98] disabled:opacity-50"
                style={{ backgroundColor: "#059669" }}
                data-testid="upload-btn"
              >
                {uploading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Importing...</>
                ) : (
                  <><Upload className="h-4 w-4" /> Upload Excel File</>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Results */}
        {results && (
          <div className="rounded-2xl p-5 shadow-card" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }} data-testid="import-results">
            <div className="flex items-center gap-2 mb-4">
              <FileSpreadsheet className="h-5 w-5" style={{ color: "var(--brand-primary)" }} />
              <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>Import Results</h3>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="rounded-xl p-3 text-center" style={{ backgroundColor: "#D1FAE5" }}>
                <p className="text-2xl font-bold" style={{ color: "#059669" }}>{totalCreated}</p>
                <p className="text-xs" style={{ color: "#059669" }}>Records Imported</p>
              </div>
              {totalErrors > 0 && (
                <div className="rounded-xl p-3 text-center" style={{ backgroundColor: "#FEE2E2" }}>
                  <p className="text-2xl font-bold" style={{ color: "#DC2626" }}>{totalErrors}</p>
                  <p className="text-xs" style={{ color: "#DC2626" }}>Errors</p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              {Object.entries(results).map(([sheet, data]) => (
                <div key={sheet} className="flex items-center justify-between py-2 px-3 rounded-lg" style={{ backgroundColor: "var(--bg-subtle)" }}>
                  <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{sheet}</span>
                  <div className="flex items-center gap-2">
                    {data.created > 0 && (
                      <span className="flex items-center gap-1 text-xs font-medium" style={{ color: "#059669" }}>
                        <Check className="h-3 w-3" /> {data.created}
                      </span>
                    )}
                    {data.errors.length > 0 && (
                      <span className="flex items-center gap-1 text-xs font-medium" style={{ color: "#DC2626" }}>
                        <AlertCircle className="h-3 w-3" /> {data.errors.length}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => navigate("/")}
              className="w-full mt-4 rounded-xl py-2.5 text-sm font-medium transition-all"
              style={{ backgroundColor: "var(--brand-primary)", color: "white" }}
              data-testid="go-dashboard-btn"
            >
              Go to Dashboard
            </button>
          </div>
        )}
      </div>

      <BottomNav onAddClick={() => setShowAddSheet(true)} />
      <AddActionSheet isOpen={showAddSheet} onClose={() => setShowAddSheet(false)} />
    </div>
  );
};

export default DataImport;
