import { useState, useEffect, useRef } from "react";
import { KeyRound, Fingerprint, Loader2, X, Check, ChevronRight } from "lucide-react";
import axios from "axios";

const backendUrl = process.env.REACT_APP_BACKEND_URL;

// WebAuthn helpers
function _base64urlToBuffer(base64url) {
  const padding = "=".repeat((4 - (base64url.length % 4)) % 4);
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/") + padding;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function _bufferToBase64url(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

const SecuritySetupPrompt = ({ onDismiss }) => {
  const [status, setStatus] = useState(null); // { has_mpin, has_biometric }
  const [step, setStep] = useState("check"); // check | mpin | biometric | done
  const [mpinDigits, setMpinDigits] = useState(["", "", "", ""]);
  const [mpinConfirm, setMpinConfirm] = useState(["", "", "", ""]);
  const [mpinStep, setMpinStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const mpinRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];
  const confirmRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];

  useEffect(() => {
    // Check if biometric was permanently dismissed
    const bioDismissed = localStorage.getItem("moneyssutra_biometric_dismissed") === "true";

    (async () => {
      try {
        const res = await axios.get(`${backendUrl}/api/auth/security-status`, { withCredentials: true });
        setStatus(res.data);
        if (!res.data.needs_setup) {
          onDismiss?.();
          return;
        }
        // Start with whichever is missing
        if (!res.data.has_mpin) setStep("mpin");
        else if (!res.data.has_biometric && !bioDismissed) setStep("biometric");
        else onDismiss?.();
      } catch {
        onDismiss?.();
      }
    })();
  }, []);

  const handleDigitChange = (arr, setArr, refs, index, value) => {
    if (!/^\d?$/.test(value)) return;
    const updated = [...arr];
    updated[index] = value;
    setArr(updated);
    if (value && index < 3) refs[index + 1].current?.focus();
  };

  const handleDigitKeyDown = (arr, refs, index, e) => {
    if (e.key === "Backspace" && !arr[index] && index > 0) {
      refs[index - 1].current?.focus();
    }
  };

  const handleMpinSubmit = async () => {
    setError("");
    const pin = mpinDigits.join("");
    if (pin.length !== 4) { setError("Enter all 4 digits"); return; }
    if (mpinStep === 1) {
      setMpinStep(2);
      setTimeout(() => confirmRefs[0].current?.focus(), 100);
      return;
    }
    const confirmPin = mpinConfirm.join("");
    if (pin !== confirmPin) {
      setError("PINs don't match");
      setMpinConfirm(["", "", "", ""]);
      confirmRefs[0].current?.focus();
      return;
    }
    setSaving(true);
    try {
      await axios.post(`${backendUrl}/api/mpin/set`, { mpin: pin }, { withCredentials: true });
      // Move to biometric if not set and not permanently dismissed
      const bioDismissed = localStorage.getItem("moneyssutra_biometric_dismissed") === "true";
      if (!status?.has_biometric && !bioDismissed) {
        setStep("biometric");
        setError("");
      } else {
        setStep("done");
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to set MPIN");
    } finally { setSaving(false); }
  };

  const handleBiometricSetup = async () => {
    setError("");
    if (!window.PublicKeyCredential) {
      setError("Biometrics not supported on this device");
      return;
    }
    // Iframe check
    const isInIframe = window.self !== window.top;
    if (isInIframe) {
      setError("Biometric needs a direct browser window. Opening in new tab...");
      window.open(window.location.href, "_blank");
      return;
    }
    // Check platform authenticator
    try {
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      if (!available) {
        setError("No biometric sensor found (Touch ID, Windows Hello, etc.). You can set this up later on a supported device.");
        return;
      }
    } catch { /* proceed */ }

    setSaving(true);
    try {
      const optRes = await axios.post(`${backendUrl}/api/biometric/register/options`, {}, { withCredentials: true });
      const options = JSON.parse(optRes.data.options);
      options.challenge = _base64urlToBuffer(options.challenge);
      options.user.id = _base64urlToBuffer(options.user.id);
      if (options.excludeCredentials) {
        options.excludeCredentials = options.excludeCredentials.map(c => ({ ...c, id: _base64urlToBuffer(c.id) }));
      }
      const credential = await navigator.credentials.create({ publicKey: options });
      const attestation = {
        id: credential.id,
        rawId: _bufferToBase64url(credential.rawId),
        type: credential.type,
        response: {
          attestationObject: _bufferToBase64url(credential.response.attestationObject),
          clientDataJSON: _bufferToBase64url(credential.response.clientDataJSON),
        },
      };
      await axios.post(`${backendUrl}/api/biometric/register/verify`, {
        credential: attestation,
        device_name: navigator.userAgent.includes("Mobile") ? "Mobile Device" : "Desktop",
      }, { withCredentials: true });
      setStep("done");
    } catch (err) {
      if (err.name === "NotAllowedError") {
        setError("Registration denied. Ensure your device biometric (Touch ID, Windows Hello) is enabled.");
      } else if (err.name === "SecurityError") {
        setError("Blocked by browser security. Open the app directly (not in iframe/preview).");
        window.open(window.location.href, "_blank");
      } else {
        setError(err.response?.data?.detail || err.message || "Failed to set up biometric");
      }
    } finally { setSaving(false); }
  };

  if (step === "check" || !status) return null;

  if (step === "done") {
    setTimeout(() => onDismiss?.(), 1500);
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
        <div className="w-full max-w-sm rounded-2xl p-6 text-center" style={{ backgroundColor: "var(--bg-card, #fff)" }}>
          <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3 bg-green-100">
            <Check className="h-7 w-7 text-green-600" />
          </div>
          <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>All Set!</h2>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Your account is now more secure</p>
        </div>
      </div>
    );
  }

  const activeDigits = mpinStep === 1 ? mpinDigits : mpinConfirm;
  const activeRefs = mpinStep === 1 ? mpinRefs : confirmRefs;
  const activeSet = mpinStep === 1 ? setMpinDigits : setMpinConfirm;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
      <div className="w-full max-w-sm rounded-2xl p-6 relative" style={{ backgroundColor: "var(--bg-card, #fff)" }}>
        <button onClick={onDismiss} className="absolute top-4 right-4 p-1 rounded-lg hover:bg-gray-100" data-testid="dismiss-setup">
          <X className="h-5 w-5" style={{ color: "var(--text-muted, #666)" }} />
        </button>

        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 mb-5">
          <div className={`w-2 h-2 rounded-full ${step === "mpin" ? "bg-green-500" : "bg-gray-300"}`} />
          <div className={`w-8 h-0.5 ${status?.has_mpin || step === "biometric" ? "bg-green-500" : "bg-gray-300"}`} />
          <div className={`w-2 h-2 rounded-full ${step === "biometric" ? "bg-green-500" : "bg-gray-300"}`} />
        </div>

        {step === "mpin" && (
          <>
            <div className="flex flex-col items-center mb-5">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mb-2" style={{ backgroundColor: "var(--brand-primary-soft, #d1fae5)" }}>
                <KeyRound className="h-6 w-6" style={{ color: "var(--brand-primary, #059669)" }} />
              </div>
              <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Set Your MPIN</h2>
              <p className="text-sm text-center mt-1" style={{ color: "var(--text-muted)" }}>
                {mpinStep === 1 ? "Create a 4-digit PIN for quick login" : "Re-enter to confirm"}
              </p>
            </div>

            {error && <div className="mb-3 p-2 rounded-lg text-sm text-center bg-red-50 text-red-600">{error}</div>}

            <div className="flex gap-3 justify-center mb-5">
              {activeDigits.map((d, i) => (
                <input
                  key={`setup-${mpinStep}-${i}`}
                  ref={activeRefs[i]}
                  type="password" inputMode="numeric" maxLength={1} value={d}
                  onChange={(e) => handleDigitChange(activeDigits, activeSet, activeRefs, i, e.target.value)}
                  onKeyDown={(e) => handleDigitKeyDown(activeDigits, activeRefs, i, e)}
                  className="w-13 h-13 text-center text-2xl font-bold rounded-xl outline-none focus:ring-2"
                  style={{ backgroundColor: "var(--bg-subtle, #f8fafc)", border: "2px solid var(--border-light, #e2e8f0)", color: "var(--text-primary)", width: "3.25rem", height: "3.25rem" }}
                  data-testid={`setup-mpin-${mpinStep}-${i}`}
                  autoFocus={i === 0}
                />
              ))}
            </div>

            <div className="flex gap-2">
              {mpinStep === 2 && (
                <button onClick={() => { setMpinStep(1); setMpinConfirm(["","","",""]); setError(""); }}
                  className="flex-1 py-3 rounded-xl font-medium text-sm" style={{ border: "1px solid var(--border-light)" }}>
                  Back
                </button>
              )}
              <button onClick={handleMpinSubmit}
                disabled={saving || activeDigits.join("").length !== 4}
                className="flex-1 py-3 rounded-xl font-semibold text-white text-sm disabled:opacity-50 flex items-center justify-center gap-1"
                style={{ backgroundColor: "var(--brand-primary, #059669)" }}
                data-testid="setup-mpin-next">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {mpinStep === 1 ? "Next" : "Set MPIN"}
              </button>
            </div>

            <button onClick={() => {
              const bioDismissed = localStorage.getItem("moneyssutra_biometric_dismissed") === "true";
              if (!status?.has_biometric && !bioDismissed) setStep("biometric");
              else onDismiss?.();
            }} className="w-full mt-2 py-2 text-xs font-medium flex items-center justify-center gap-1"
              style={{ color: "var(--text-muted)" }} data-testid="skip-mpin-setup">
              Skip <ChevronRight className="h-3 w-3" />
            </button>
          </>
        )}

        {step === "biometric" && (
          <>
            <div className="flex flex-col items-center mb-5">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mb-2" style={{ backgroundColor: "var(--brand-primary-soft, #d1fae5)" }}>
                <Fingerprint className="h-6 w-6" style={{ color: "var(--brand-primary, #059669)" }} />
              </div>
              <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Set Up Biometric</h2>
              <p className="text-sm text-center mt-1" style={{ color: "var(--text-muted)" }}>
                Use fingerprint or face to login instantly
              </p>
            </div>

            {error && <div className="mb-3 p-2 rounded-lg text-sm text-center bg-red-50 text-red-600">{error}</div>}

            <div className="flex flex-col items-center py-4 mb-2">
              <Fingerprint className="h-20 w-20" style={{ color: "var(--brand-primary, #059669)", opacity: 0.6 }} />
            </div>

            <button onClick={handleBiometricSetup}
              disabled={saving}
              className="w-full py-3 rounded-xl font-semibold text-white text-sm disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ backgroundColor: "var(--brand-primary, #059669)" }}
              data-testid="setup-biometric-now">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Fingerprint className="h-4 w-4" />}
              Register Biometric
            </button>

            <button onClick={onDismiss}
              className="w-full mt-3 py-2.5 rounded-xl text-sm font-medium border"
              style={{ color: "var(--text-primary)", borderColor: "var(--border-light)" }}
              data-testid="skip-biometric-setup">
              Skip for now
            </button>

            <button onClick={() => {
              localStorage.setItem("moneyssutra_biometric_dismissed", "true");
              onDismiss?.();
            }}
              className="w-full mt-1.5 py-2 text-xs"
              style={{ color: "var(--text-muted)" }}
              data-testid="biometric-from-settings">
              I'll set it up from Settings
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default SecuritySetupPrompt;
