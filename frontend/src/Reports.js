import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  FileText, 
  Download, 
  Calendar,
  TrendingUp,
  TrendingDown,
  Wallet,
  CreditCard,
  PiggyBank,
  Target,
  Building2,
  Loader2,
  FileSpreadsheet,
  File,
  CheckCircle2
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import AddActionSheet from "@/components/AddActionSheet";
import { toast } from "sonner";

const backendUrl = process.env.REACT_APP_BACKEND_URL;

const Reports = () => {
  const navigate = useNavigate();
  const [showAddSheet, setShowAddSheet] = useState(false);
  
  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });
  const [exportFormat, setExportFormat] = useState("pdf");
  const [generating, setGenerating] = useState(null);
  const [downloadedReports, setDownloadedReports] = useState([]);

  const reports = [
    {
      id: "income",
      title: "Income Report",
      description: "Detailed breakdown of all income sources",
      icon: TrendingUp,
      color: "#059669"
    },
    {
      id: "expense",
      title: "Expense Report",
      description: "Analysis of spending patterns and categories",
      icon: TrendingDown,
      color: "#EF4444"
    },
    {
      id: "cashflow",
      title: "Cash Flow Report",
      description: "Income vs expenses over time",
      icon: Wallet,
      color: "#3B82F6"
    },
    {
      id: "loan",
      title: "Loan Report",
      description: "Outstanding loans and payment details",
      icon: CreditCard,
      color: "#F59E0B"
    },
    {
      id: "investment",
      title: "Investment Report",
      description: "Portfolio performance and allocation",
      icon: PiggyBank,
      color: "#8B5CF6"
    },
    {
      id: "networth",
      title: "Net Worth Report",
      description: "Complete snapshot of your financial position",
      icon: Building2,
      color: "#06B6D4"
    },
    {
      id: "goal",
      title: "Goal Progress Report",
      description: "Track progress towards financial goals",
      icon: Target,
      color: "#EC4899"
    }
  ];

  const validateDateRange = () => {
    if (!dateRange.from || !dateRange.to) {
      toast.error("Please select both start and end dates");
      return false;
    }
    if (new Date(dateRange.from) > new Date(dateRange.to)) {
      toast.error("Start date cannot be after end date");
      return false;
    }
    return true;
  };

  const handleGenerateReport = async (reportId) => {
    if (!validateDateRange()) return;
    
    setGenerating(reportId);
    
    try {
      const report = reports.find(r => r.id === reportId);
      const fileExt = exportFormat === 'excel' ? 'xlsx' : 'pdf';
      const filename = `${reportId}_report_${new Date().toISOString().split('T')[0]}.${fileExt}`;
      
      // Build the URL with query parameters
      const url = `${backendUrl}/api/reports/generate/${reportId}?format=${exportFormat}&from_date=${dateRange.from}&to_date=${dateRange.to}`;
      
      // Use fetch with blob and create object URL
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': exportFormat === 'excel' 
            ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            : 'application/pdf'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate report');
      }
      
      const blob = await response.blob();
      
      // Create a File object from the blob
      const file = new File([blob], filename, { 
        type: exportFormat === 'excel' 
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'application/pdf'
      });
      
      // Use the File System Access API if available (Chrome 86+)
      if ('showSaveFilePicker' in window) {
        try {
          const handle = await window.showSaveFilePicker({
            suggestedName: filename,
            types: [{
              description: exportFormat === 'excel' ? 'Excel File' : 'PDF Document',
              accept: exportFormat === 'excel' 
                ? { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] }
                : { 'application/pdf': ['.pdf'] }
            }]
          });
          const writable = await handle.createWritable();
          await writable.write(file);
          await writable.close();
          
          toast.success(`${report.title} saved successfully!`);
          setDownloadedReports(prev => [...prev, reportId]);
          setTimeout(() => {
            setDownloadedReports(prev => prev.filter(id => id !== reportId));
          }, 5000);
          return;
        } catch (fsError) {
          // User cancelled or API not supported, fall through to blob method
          if (fsError.name === 'AbortError') {
            setGenerating(null);
            return;
          }
        }
      }
      
      // Fallback: Create blob URL and trigger download
      const blobUrl = URL.createObjectURL(blob);
      
      // Create invisible iframe for download (less likely to be blocked)
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
      
      // Create link inside iframe
      const iframeDoc = iframe.contentWindow.document;
      iframeDoc.open();
      iframeDoc.write(`
        <html><body>
          <a id="downloadLink" href="${blobUrl}" download="${filename}">Download</a>
          <script>document.getElementById('downloadLink').click();</script>
        </body></html>
      `);
      iframeDoc.close();
      
      // Cleanup
      setTimeout(() => {
        document.body.removeChild(iframe);
        URL.revokeObjectURL(blobUrl);
      }, 5000);
      
      toast.success(`${report.title} downloaded! Check your Downloads folder.`);
      setDownloadedReports(prev => [...prev, reportId]);
      
      setTimeout(() => {
        setDownloadedReports(prev => prev.filter(id => id !== reportId));
      }, 5000);
      
    } catch (error) {
      console.error("Report generation error:", error);
      toast.error("Failed to generate report. Please try again.");
    } finally {
      setGenerating(null);
    }
  };

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: "var(--bg-app)" }} data-testid="reports-page">
      {/* Header */}
      <header className="sticky top-0 z-40 px-4 py-4 flex items-center gap-3" style={{ backgroundColor: "var(--bg-app)" }}>
        <button
          onClick={() => navigate("/insights", { replace: true })}
          className="flex items-center justify-center w-10 h-10 rounded-full transition-colors hover:bg-gray-100"
          data-testid="back-button"
        >
          <ArrowLeft className="h-5 w-5" style={{ color: "var(--text-primary)" }} />
        </button>
        <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Reports</h1>
      </header>

      {/* Content */}
      <div className="px-4 py-2 space-y-6">
        {/* Filters Section */}
        <div className="rounded-2xl p-4" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
          <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <Calendar className="h-5 w-5" style={{ color: "var(--brand-primary)" }} />
            Report Settings
          </h3>
          
          {/* Date Range */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>From Date</label>
              <input
                type="date"
                value={dateRange.from}
                onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                className="w-full p-3 rounded-xl text-sm"
                style={{ backgroundColor: "var(--bg-subtle)", border: "1px solid var(--border-light)", color: "var(--text-primary)" }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>To Date</label>
              <input
                type="date"
                value={dateRange.to}
                onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                className="w-full p-3 rounded-xl text-sm"
                style={{ backgroundColor: "var(--bg-subtle)", border: "1px solid var(--border-light)", color: "var(--text-primary)" }}
              />
            </div>
          </div>
          
          {/* Export Format */}
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: "var(--text-muted)" }}>Export Format</label>
            <div className="flex gap-2">
              <button
                onClick={() => setExportFormat("pdf")}
                className={`flex-1 py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all ${
                  exportFormat === "pdf" ? "text-white" : ""
                }`}
                style={{
                  backgroundColor: exportFormat === "pdf" ? "#EF4444" : "var(--bg-subtle)",
                  color: exportFormat === "pdf" ? "white" : "var(--text-secondary)"
                }}
              >
                <File className="h-4 w-4" />
                PDF
              </button>
              <button
                onClick={() => setExportFormat("excel")}
                className={`flex-1 py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all ${
                  exportFormat === "excel" ? "text-white" : ""
                }`}
                style={{
                  backgroundColor: exportFormat === "excel" ? "#059669" : "var(--bg-subtle)",
                  color: exportFormat === "excel" ? "white" : "var(--text-secondary)"
                }}
              >
                <FileSpreadsheet className="h-4 w-4" />
                Excel
              </button>
            </div>
          </div>
        </div>

        {/* Reports List */}
        <div className="space-y-3">
          <h3 className="font-semibold px-1" style={{ color: "var(--text-primary)" }}>Available Reports</h3>
          
          {reports.map((report) => {
            const Icon = report.icon;
            const isGenerating = generating === report.id;
            const isDownloaded = downloadedReports.includes(report.id);
            
            return (
              <div
                key={report.id}
                className="rounded-2xl p-4"
                style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}
              >
                <div className="flex items-start gap-4">
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${report.color}15` }}
                  >
                    <Icon className="h-6 w-6" style={{ color: report.color }} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold" style={{ color: "var(--text-primary)" }}>
                      {report.title}
                    </h4>
                    <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
                      {report.description}
                    </p>
                    
                    <button
                      onClick={() => handleGenerateReport(report.id)}
                      disabled={isGenerating}
                      className="mt-3 px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-all disabled:opacity-50"
                      style={{ backgroundColor: `${report.color}15`, color: report.color }}
                      data-testid={`generate-${report.id}-btn`}
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : isDownloaded ? (
                        <>
                          <CheckCircle2 className="h-4 w-4" />
                          Downloaded!
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4" />
                          Download {exportFormat.toUpperCase()}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Info Note */}
        <div className="rounded-xl p-4" style={{ backgroundColor: "var(--brand-primary-soft)" }}>
          <p className="text-sm text-center" style={{ color: "var(--brand-primary)" }}>
            Reports include all your financial data within the selected date range
          </p>
        </div>
      </div>

      <AddActionSheet isOpen={showAddSheet} onClose={() => setShowAddSheet(false)} />
      <BottomNav onAddClick={() => setShowAddSheet(true)} />
    </div>
  );
};

export default Reports;
