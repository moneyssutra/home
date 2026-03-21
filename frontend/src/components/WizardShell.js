import { ChevronLeft, ChevronRight, Check, X, Trash2 } from "lucide-react";

/**
 * Shared wizard shell for all Add/Edit forms.
 * Provides: header, step indicator, step content area, and sticky action buttons.
 *
 * Props:
 *  - title: string (e.g. "Add Job Income")
 *  - step / setStep: current step state
 *  - totalSteps: number
 *  - stepLabels: string[] (e.g. ["Source", "Amount", "Schedule"])
 *  - onNext: () => boolean (validate + advance)
 *  - onSave: () => void
 *  - onDelete?: () => void (edit mode)
 *  - isEdit: boolean
 *  - isSubmitting: boolean
 *  - accentColor: string (e.g. "#00D09C")
 *  - children: step content JSX
 *  - editModeContent?: JSX for edit mode (all fields at once)
 *  - ledgerContent?: JSX for income ledger in edit mode
 *  - errorContent?: JSX for submit errors
 *  - dialogContent?: JSX for confirmation dialogs
 */
const WizardShell = ({
  title, step, totalSteps, onNext, onPrev, onSave, onDelete,
  isEdit, isSubmitting, accentColor = "#00D09C", children,
  editModeContent, ledgerContent, errorContent, dialogContent,
  onClose
}) => {
  const navigate = (window.__navigate || (() => window.history.back()));

  const StepIndicator = () => (
    <div className="flex items-center justify-center gap-1 py-3">
      {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s) => (
        <div key={s} className="flex items-center gap-1">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
            s < step ? `text-white` : s === step ? `text-white ring-2 ring-offset-1` : "text-[#94A3B8]"
          }`} style={
            s < step ? { backgroundColor: accentColor } :
            s === step ? { backgroundColor: accentColor, ringColor: `${accentColor}40` } :
            { backgroundColor: "var(--bg-subtle)", border: "1px solid var(--border-light)" }
          }>
            {s < step ? <Check className="h-3.5 w-3.5" /> : s}
          </div>
          {s < totalSteps && <div className={`w-8 h-0.5 rounded`} style={{ backgroundColor: s < step ? accentColor : "#E2E8F0" }} />}
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "var(--bg-app)" }}>
      {/* Header */}
      <header className="flex items-center px-5 pt-6 pb-2 flex-shrink-0">
        <button type="button" onClick={() => isEdit ? window.history.back() : (step > 1 ? onPrev() : window.history.back())}
          className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}
          data-testid="back-button">
          <ChevronLeft className="h-4 w-4" style={{ color: "var(--text-primary)" }} />
        </button>
        <h1 className="flex-1 text-center text-lg font-bold" style={{ color: "var(--text-primary)" }} data-testid="page-title">{title}</h1>
        {!isEdit && onClose ? (
          <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }} data-testid="close-button">
            <X className="h-4 w-4" style={{ color: "var(--text-primary)" }} />
          </button>
        ) : <div className="h-9 w-9" />}
      </header>

      {/* Step Indicator */}
      {!isEdit && <div className="px-5"><StepIndicator /></div>}

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-40">
        <div className="mx-auto w-full max-w-[540px] px-5 pt-6 pb-4">
          {isEdit ? editModeContent : children}
          {ledgerContent}
          {errorContent}
        </div>
      </div>

      {/* Sticky Action Buttons */}
      <div className="fixed bottom-0 left-0 right-0 border-t px-4 py-3 z-40" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-light)" }}>
        <div className="mx-auto max-w-[540px] flex gap-3">
          {isEdit ? (
            <>
              {onDelete && (
                <button type="button" onClick={onDelete} disabled={isSubmitting}
                  className="flex-1 flex items-center justify-center gap-2 h-12 rounded-xl border text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-50"
                  style={{ borderColor: "var(--status-error)", color: "var(--status-error)" }} data-testid="delete-button">
                  <Trash2 className="h-4 w-4" /> Delete
                </button>
              )}
              <button type="button" onClick={onSave} disabled={isSubmitting}
                className="flex-[2] h-12 rounded-xl text-white text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-50 shadow-sm"
                style={{ backgroundColor: accentColor }} data-testid="update-button">
                {isSubmitting ? "Updating..." : `Update ${title.replace(/^(Add|Edit)\s*/i, '')}`}
              </button>
            </>
          ) : (
            <>
              {step > 1 && (
                <button type="button" onClick={onPrev}
                  className="flex items-center justify-center gap-1.5 h-12 px-5 rounded-xl border font-medium text-sm transition-all active:scale-[0.98]"
                  style={{ borderColor: "var(--border-light)", color: "var(--text-primary)" }} data-testid="prev-step-btn">
                  <ChevronLeft className="h-4 w-4" /> Back
                </button>
              )}
              {step < totalSteps ? (
                <button type="button" onClick={onNext}
                  className="flex-1 flex items-center justify-center gap-1.5 h-12 rounded-xl text-white font-semibold text-sm transition-all active:scale-[0.98] shadow-sm"
                  style={{ backgroundColor: accentColor }} data-testid="next-step-btn">
                  Next <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <button type="button" onClick={onSave} disabled={isSubmitting}
                  className="flex-1 h-12 rounded-xl text-white font-semibold text-sm transition-all active:scale-[0.98] disabled:opacity-50 shadow-sm"
                  style={{ backgroundColor: accentColor }} data-testid="save-button">
                  {isSubmitting ? "Saving..." : `Save ${title.replace(/^(Add|Edit)\s*/i, '')}`}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Dialogs rendered outside the flow */}
      {dialogContent}
    </div>
  );
};

export default WizardShell;
