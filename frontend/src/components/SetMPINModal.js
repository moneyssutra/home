import { useState, useRef } from "react";
import { KeyRound, Loader2, X } from "lucide-react";
import axios from "axios";

const backendUrl = process.env.REACT_APP_BACKEND_URL;

const SetMPINModal = ({ isOpen, onClose, onSuccess }) => {
  const [step, setStep] = useState(1); // 1=enter, 2=confirm
  const [digits, setDigits] = useState(["", "", "", ""]);
  const [confirm, setConfirm] = useState(["", "", "", ""]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const refs = [useRef(null), useRef(null), useRef(null), useRef(null)];
  const confirmRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];

  if (!isOpen) return null;

  const handleChange = (arr, setArr, inputRefs, index, value) => {
    if (!/^\d?$/.test(value)) return;
    const updated = [...arr];
    updated[index] = value;
    setArr(updated);
    if (value && index < 3) inputRefs[index + 1].current?.focus();
  };

  const handleKeyDown = (arr, inputRefs, index, e) => {
    if (e.key === "Backspace" && !arr[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  const handleSubmit = async () => {
    setError("");
    const pin = digits.join("");
    if (pin.length !== 4) { setError("Enter all 4 digits"); return; }

    if (step === 1) {
      setStep(2);
      setTimeout(() => confirmRefs[0].current?.focus(), 100);
      return;
    }

    const confirmPin = confirm.join("");
    if (pin !== confirmPin) {
      setError("PINs don't match. Try again.");
      setConfirm(["", "", "", ""]);
      confirmRefs[0].current?.focus();
      return;
    }

    setSaving(true);
    try {
      await axios.post(`${backendUrl}/api/mpin/set`, { mpin: pin }, { withCredentials: true });
      onSuccess?.();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to set MPIN");
    } finally { setSaving(false); }
  };

  const activeDigits = step === 1 ? digits : confirm;
  const activeRefs = step === 1 ? refs : confirmRefs;
  const activeSet = step === 1 ? setDigits : setConfirm;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
      <div className="w-full max-w-sm rounded-2xl p-6 relative" style={{ backgroundColor: "var(--bg-card, #fff)" }}>
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-lg hover:bg-gray-100" data-testid="close-mpin-modal">
          <X className="h-5 w-5" style={{ color: "var(--text-muted, #666)" }} />
        </button>

        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-full flex items-center justify-center mb-3" style={{ backgroundColor: "var(--brand-primary-soft, #d1fae5)" }}>
            <KeyRound className="h-7 w-7" style={{ color: "var(--brand-primary, #059669)" }} />
          </div>
          <h2 className="text-lg font-bold" style={{ color: "var(--text-primary, #1a1a1a)" }}>Set Your MPIN</h2>
          <p className="text-sm text-center mt-1" style={{ color: "var(--text-muted, #666)" }}>
            {step === 1 ? "Create a 4-digit PIN for quick login" : "Re-enter your PIN to confirm"}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl text-sm text-center" style={{ backgroundColor: "#FEE2E2", color: "#DC2626" }}>
            {error}
          </div>
        )}

        <div className="flex gap-3 justify-center mb-6">
          {activeDigits.map((d, i) => (
            <input
              key={`mpin-modal-${step}-${i}`}
              ref={activeRefs[i]}
              type="password"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={(e) => handleChange(activeDigits, activeSet, activeRefs, i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(activeDigits, activeRefs, i, e)}
              className="w-14 h-14 text-center text-2xl font-bold rounded-xl outline-none transition-all focus:ring-2"
              style={{
                backgroundColor: "var(--bg-subtle, #f8fafc)",
                border: "2px solid var(--border-light, #e2e8f0)",
                color: "var(--text-primary, #1a1a1a)",
              }}
              data-testid={`modal-mpin-digit-${step}-${i}`}
              autoFocus={i === 0}
            />
          ))}
        </div>

        <div className="flex gap-2">
          {step === 2 && (
            <button
              onClick={() => { setStep(1); setConfirm(["","","",""]); setError(""); }}
              className="flex-1 py-3 rounded-xl font-medium text-sm"
              style={{ color: "var(--text-secondary)", border: "1px solid var(--border-light, #e2e8f0)" }}
            >
              Back
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={saving || activeDigits.join("").length !== 4}
            className="flex-1 py-3 rounded-xl font-semibold text-white text-sm disabled:opacity-50 flex items-center justify-center gap-1"
            style={{ backgroundColor: "var(--brand-primary, #059669)" }}
            data-testid="modal-mpin-submit"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {step === 1 ? "Next" : "Set MPIN"}
          </button>
        </div>

        <button onClick={onClose} className="w-full mt-3 py-2 text-sm font-medium" style={{ color: "var(--text-muted, #666)" }} data-testid="skip-mpin-btn">
          Skip for now
        </button>
      </div>
    </div>
  );
};

export default SetMPINModal;
