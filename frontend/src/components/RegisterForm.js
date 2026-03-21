import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { 
  User, Lock, Eye, EyeOff, AlertCircle, Mail, Phone, Calendar,
  Check, X, Loader2, ChevronLeft, Users, ShieldCheck
} from "lucide-react";
import axios from "axios";
import { format } from "date-fns";
import { RestrictedDatePicker } from "@/components/ui/date-picker";

const backendUrl = process.env.REACT_APP_BACKEND_URL;

// Password strength calculator
const calculatePasswordStrength = (password) => {
  if (!password) return { level: 0, label: "", color: "" };
  
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[!@#$%^&*()_+\-=\[\]{}|;':",.\/<>?]/.test(password)) score++;
  
  if (score <= 2) return { level: 1, label: "Weak", color: "#EF4444" };
  if (score <= 3) return { level: 2, label: "Medium", color: "#F59E0B" };
  return { level: 3, label: "Strong", color: "#00D09C" };
};

// Validate name (letters only)
const isValidName = (name) => /^[A-Za-z\s]+$/.test(name);

// Validate email format
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// Validate mobile (10 digits)
const isValidMobile = (mobile) => !mobile || /^\d{10}$/.test(mobile);

const RegisterForm = ({ onBackToLogin, initialInviteCode = "" }) => {
  const navigate = useNavigate();
  const { register } = useAuth();
  
  // Form fields
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [sex, setSex] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Invite code
  const [inviteCode, setInviteCode] = useState(initialInviteCode);
  const [showInviteField, setShowInviteField] = useState(!!initialInviteCode);
  const [inviteInfo, setInviteInfo] = useState(null);
  const [checkingInvite, setCheckingInvite] = useState(false);
  
  // Email OTP verification state
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailOtp, setEmailOtp] = useState(["", "", "", "", "", ""]);
  const [emailVerified, setEmailVerified] = useState(false);
  const [emailVerificationToken, setEmailVerificationToken] = useState(null);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [otpResendTimer, setOtpResendTimer] = useState(0);
  const otpRefs = useRef([]);
  
  // Validation states
  const [emailAvailable, setEmailAvailable] = useState(null);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  
  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Today's date for DOB constraint
  const today = format(new Date(), "yyyy-MM-dd");

  // OTP resend countdown timer
  useEffect(() => {
    if (otpResendTimer <= 0) return;
    const t = setTimeout(() => setOtpResendTimer(otpResendTimer - 1), 1000);
    return () => clearTimeout(t);
  }, [otpResendTimer]);

  // Reset verification when email changes
  useEffect(() => {
    setEmailOtpSent(false);
    setEmailOtp(["", "", "", "", "", ""]);
    setEmailVerified(false);
    setEmailVerificationToken(null);
    setOtpError("");
  }, [email]);

  // Send signup OTP
  const handleSendSignupOtp = async () => {
    if (!email.trim() || !isValidEmail(email)) return;
    setOtpSending(true);
    setOtpError("");
    try {
      await axios.post(`${backendUrl}/api/auth/send-signup-otp`, { email: email.trim().toLowerCase() });
      setEmailOtpSent(true);
      setOtpResendTimer(60);
    } catch (err) {
      setOtpError(err.response?.data?.detail || err.response?.data?.message || "Failed to send OTP");
    } finally {
      setOtpSending(false);
    }
  };

  // OTP input handlers
  const handleOtpChange = (index, value) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...emailOtp];
    next[index] = value;
    setEmailOtp(next);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };
  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !emailOtp[index] && index > 0) otpRefs.current[index - 1]?.focus();
  };
  const handleOtpPaste = (e) => {
    const paste = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (paste.length === 6) {
      setEmailOtp(paste.split(""));
      otpRefs.current[5]?.focus();
    }
  };

  // Verify signup OTP
  const handleVerifySignupOtp = async () => {
    const otpString = emailOtp.join("");
    if (otpString.length !== 6) return;
    setOtpVerifying(true);
    setOtpError("");
    try {
      const res = await axios.post(`${backendUrl}/api/auth/verify-signup-otp`, {
        email: email.trim().toLowerCase(),
        otp: otpString,
      });
      setEmailVerified(true);
      setEmailVerificationToken(res.data.verification_token);
    } catch (err) {
      setOtpError(err.response?.data?.detail || "Verification failed");
    } finally {
      setOtpVerifying(false);
    }
  };

  // Lookup invite code when it changes
  useEffect(() => {
    const lookupInvite = async () => {
      if (!inviteCode || inviteCode.length < 4) {
        setInviteInfo(null);
        return;
      }
      setCheckingInvite(true);
      try {
        const res = await axios.get(`${backendUrl}/api/family/invite-info/${inviteCode.trim()}`);
        setInviteInfo(res.data);
      } catch {
        setInviteInfo(null);
      } finally {
        setCheckingInvite(false);
      }
    };
    const timer = setTimeout(lookupInvite, 500);
    return () => clearTimeout(timer);
  }, [inviteCode]);

  // Password strength
  const passwordStrength = calculatePasswordStrength(password);
  
  // Check password requirements
  const passwordChecks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*()_+\-=\[\]{}|;':",.\/<>?]/.test(password)
  };

  // Debounced email availability check
  const checkEmailAvailability = useCallback(async (emailValue) => {
    if (!emailValue || !isValidEmail(emailValue)) {
      setEmailAvailable(null);
      return;
    }
    
    setCheckingEmail(true);
    try {
      const response = await axios.post(`${backendUrl}/api/auth/check-availability`, {
        email: emailValue
      });
      setEmailAvailable(response.data.email_available);
    } catch (err) {
      console.error("Error checking email:", err);
      setEmailAvailable(null);
    } finally {
      setCheckingEmail(false);
    }
  }, []);

  // Debounce effect for email
  useEffect(() => {
    const timer = setTimeout(() => {
      if (email.trim() && isValidEmail(email)) {
        checkEmailAvailability(email.trim());
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [email, checkEmailAvailability]);

  // Field validation
  const validateField = (field, value) => {
    const newErrors = { ...errors };
    
    switch (field) {
      case "firstName":
        if (!value.trim()) {
          newErrors.firstName = "First name is required";
        } else if (!isValidName(value)) {
          newErrors.firstName = "First name should contain only letters";
        } else {
          delete newErrors.firstName;
        }
        break;
      case "middleName":
        if (value && !isValidName(value)) {
          newErrors.middleName = "Middle name should contain only letters";
        } else {
          delete newErrors.middleName;
        }
        break;
      case "lastName":
        if (!value.trim()) {
          newErrors.lastName = "Last name is required";
        } else if (!isValidName(value)) {
          newErrors.lastName = "Last name should contain only letters";
        } else {
          delete newErrors.lastName;
        }
        break;
      case "email":
        if (!value.trim()) {
          newErrors.email = "Email is required";
        } else if (!isValidEmail(value)) {
          newErrors.email = "Please enter a valid email address";
        } else {
          delete newErrors.email;
        }
        break;
      case "mobile":
        if (value && !isValidMobile(value)) {
          newErrors.mobile = "Mobile number must be exactly 10 digits";
        } else {
          delete newErrors.mobile;
        }
        break;
      case "sex":
        if (!value) {
          newErrors.sex = "Please select your sex";
        } else {
          delete newErrors.sex;
        }
        break;
      case "dateOfBirth":
        if (!value) {
          newErrors.dateOfBirth = "Date of birth is required";
        } else {
          delete newErrors.dateOfBirth;
        }
        break;
      case "password":
        if (!Object.values(passwordChecks).every(Boolean)) {
          newErrors.password = "Password does not meet requirements";
        } else {
          delete newErrors.password;
        }
        break;
      case "confirmPassword":
        if (value !== password) {
          newErrors.confirmPassword = "Passwords do not match";
        } else {
          delete newErrors.confirmPassword;
        }
        break;
      default:
        break;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleBlur = (field, value) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    validateField(field, value);
  };

  // Check if form is valid
  const isFormValid = () => {
    return (
      firstName.trim() &&
      isValidName(firstName) &&
      lastName.trim() &&
      isValidName(lastName) &&
      (!middleName || isValidName(middleName)) &&
      email.trim() &&
      isValidEmail(email) &&
      emailAvailable === true &&
      emailVerified &&
      emailVerificationToken &&
      (!mobile || isValidMobile(mobile)) &&
      sex &&
      dateOfBirth &&
      Object.values(passwordChecks).every(Boolean) &&
      password === confirmPassword
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");
    
    // Mark all fields as touched
    setTouched({
      firstName: true,
      middleName: true,
      lastName: true,
      email: true,
      mobile: true,
      sex: true,
      dateOfBirth: true,
      password: true,
      confirmPassword: true
    });
    
    if (!isFormValid()) {
      setSubmitError("Please fix the errors above");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const result = await register({
        firstName: firstName.trim(),
        middleName: middleName.trim() || null,
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        mobile: mobile || null,
        sex: sex.toLowerCase(),
        dateOfBirth: dateOfBirth,
        password: password,
        inviteCode: inviteCode.trim() || null,
        emailVerificationToken: emailVerificationToken,
      });
      
      if (result.success) {
        // Redirect to welcome/onboarding
        navigate("/home", { replace: true, state: { isNewUser: true } });
      } else {
        setSubmitError(result.error || "Registration failed. Please try again.");
      }
    } catch (err) {
      setSubmitError(err.response?.data?.detail || "Registration failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputStyle = (field, isValid = null) => ({
    backgroundColor: "var(--bg-subtle)",
    border: touched[field] 
      ? (errors[field] 
        ? "1px solid var(--status-error)" 
        : isValid === true 
          ? "1px solid var(--status-success)" 
          : "1px solid var(--border-light)")
      : "1px solid var(--border-light)",
    color: "var(--text-primary)"
  });

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center mb-6">
        <button
          type="button"
          onClick={onBackToLogin}
          className="p-2 rounded-full hover:bg-white/10 transition-colors"
        >
          <ChevronLeft className="h-5 w-5 text-white" />
        </button>
        <h2 className="text-xl font-bold text-white flex-1 text-center pr-8">
          Create Account
        </h2>
      </div>

      {/* Form Card */}
      <div className="rounded-3xl p-6 shadow-modal" style={{ backgroundColor: "var(--bg-card)" }}>
        {/* Error Message */}
        {submitError && (
          <div className="mb-4 p-3 rounded-xl flex items-center gap-2" style={{ backgroundColor: "var(--status-error-soft)", border: "1px solid var(--status-error)" }}>
            <AlertCircle className="h-5 w-5 flex-shrink-0" style={{ color: "var(--status-error)" }} />
            <p className="text-sm" style={{ color: "var(--status-error)" }}>{submitError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name Section */}
          <div className="p-4 rounded-xl" style={{ backgroundColor: "var(--bg-subtle)" }}>
            <p className="text-xs font-medium mb-3" style={{ color: "var(--text-muted)" }}>
              PERSONAL INFORMATION
            </p>
            
            {/* First Name */}
            <div className="mb-3">
              <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
                First Name <span style={{ color: "var(--status-error)" }}>*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "var(--text-muted)" }} />
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  onBlur={() => handleBlur("firstName", firstName)}
                  placeholder="Enter first name"
                  className="w-full pl-10 pr-10 py-2.5 rounded-lg text-sm outline-none transition-all"
                  style={inputStyle("firstName", !errors.firstName && firstName.trim())}
                  data-testid="first-name-input"
                />
                {touched.firstName && firstName && !errors.firstName && (
                  <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "var(--status-success)" }} />
                )}
                {touched.firstName && errors.firstName && (
                  <X className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "var(--status-error)" }} />
                )}
              </div>
              {touched.firstName && errors.firstName && (
                <p className="mt-1 text-xs" style={{ color: "var(--status-error)" }}>{errors.firstName}</p>
              )}
            </div>

            {/* Middle Name */}
            <div className="mb-3">
              <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
                Middle Name <span style={{ color: "var(--text-muted)" }}>(Optional)</span>
              </label>
              <input
                type="text"
                value={middleName}
                onChange={(e) => setMiddleName(e.target.value)}
                onBlur={() => handleBlur("middleName", middleName)}
                placeholder="Enter middle name"
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-all"
                style={inputStyle("middleName")}
                data-testid="middle-name-input"
              />
              {touched.middleName && errors.middleName && (
                <p className="mt-1 text-xs" style={{ color: "var(--status-error)" }}>{errors.middleName}</p>
              )}
            </div>

            {/* Last Name */}
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
                Last Name <span style={{ color: "var(--status-error)" }}>*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  onBlur={() => handleBlur("lastName", lastName)}
                  placeholder="Enter last name"
                  className="w-full px-3 pr-10 py-2.5 rounded-lg text-sm outline-none transition-all"
                  style={inputStyle("lastName", !errors.lastName && lastName.trim())}
                  data-testid="last-name-input"
                />
                {touched.lastName && lastName && !errors.lastName && (
                  <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "var(--status-success)" }} />
                )}
                {touched.lastName && errors.lastName && (
                  <X className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "var(--status-error)" }} />
                )}
              </div>
              {touched.lastName && errors.lastName && (
                <p className="mt-1 text-xs" style={{ color: "var(--status-error)" }}>{errors.lastName}</p>
              )}
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
              Email ID <span style={{ color: "var(--status-error)" }}>*</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "var(--text-muted)" }} />
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setEmailAvailable(null);
                }}
                onBlur={() => handleBlur("email", email)}
                placeholder="example@email.com"
                className="w-full pl-10 pr-10 py-2.5 rounded-lg text-sm outline-none transition-all"
                style={inputStyle("email", emailVerified ? true : emailAvailable === true)}
                data-testid="email-input"
                disabled={emailVerified}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {checkingEmail && <Loader2 className="h-4 w-4 animate-spin" style={{ color: "var(--text-muted)" }} />}
                {!checkingEmail && emailVerified && <ShieldCheck className="h-4 w-4" style={{ color: "var(--status-success)" }} />}
                {!checkingEmail && !emailVerified && emailAvailable === true && <Check className="h-4 w-4" style={{ color: "var(--brand-primary)" }} />}
                {!checkingEmail && emailAvailable === false && <X className="h-4 w-4" style={{ color: "var(--status-error)" }} />}
              </div>
            </div>
            {touched.email && errors.email && (
              <p className="mt-1 text-xs" style={{ color: "var(--status-error)" }}>{errors.email}</p>
            )}
            {emailAvailable === false && (
              <p className="mt-1 text-xs" style={{ color: "var(--status-error)" }}>This email is already registered.</p>
            )}
            {emailVerified && (
              <p className="mt-1 text-xs flex items-center gap-1" style={{ color: "var(--status-success)" }}>
                <ShieldCheck className="h-3 w-3" /> Email verified
              </p>
            )}

            {/* Send OTP button - show when email is available but not yet verified */}
            {emailAvailable === true && !emailVerified && !emailOtpSent && (
              <button
                type="button"
                onClick={handleSendSignupOtp}
                disabled={otpSending}
                className="mt-2 w-full py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 text-white disabled:opacity-50"
                style={{ backgroundColor: "var(--brand-primary)" }}
                data-testid="send-signup-otp-btn"
              >
                {otpSending ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</> : "Verify Email with OTP"}
              </button>
            )}

            {/* OTP Error */}
            {otpError && (
              <div className="mt-2 p-2 rounded-lg flex items-center gap-2" style={{ backgroundColor: "var(--status-error-soft)" }}>
                <AlertCircle className="h-4 w-4 flex-shrink-0" style={{ color: "var(--status-error)" }} />
                <p className="text-xs" style={{ color: "var(--status-error)" }}>{otpError}</p>
              </div>
            )}

            {/* OTP Input - show when OTP sent but not verified */}
            {emailOtpSent && !emailVerified && (
              <div className="mt-3 p-3 rounded-xl" style={{ backgroundColor: "var(--bg-subtle)", border: "1px solid var(--border-light)" }}>
                <p className="text-xs font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
                  Enter the 6-digit code sent to <strong>{email}</strong>
                </p>
                <div className="flex justify-center gap-1.5 mb-2" onPaste={handleOtpPaste}>
                  {emailOtp.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => (otpRefs.current[i] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      className="w-9 h-10 text-center text-lg font-bold rounded-lg outline-none transition-all"
                      style={{
                        backgroundColor: "var(--bg-card)",
                        border: `2px solid ${digit ? "var(--brand-primary)" : "var(--border-light)"}`,
                        color: "var(--text-primary)",
                      }}
                      data-testid={`signup-otp-input-${i}`}
                    />
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={handleVerifySignupOtp}
                    disabled={otpVerifying || emailOtp.join("").length !== 6}
                    className="py-1.5 px-4 rounded-lg text-xs font-semibold text-white disabled:opacity-50 flex items-center gap-1.5"
                    style={{ backgroundColor: "var(--brand-primary)" }}
                    data-testid="verify-signup-otp-btn"
                  >
                    {otpVerifying ? <><Loader2 className="h-3 w-3 animate-spin" /> Verifying...</> : "Verify"}
                  </button>
                  {otpResendTimer > 0 ? (
                    <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>Resend in {otpResendTimer}s</span>
                  ) : (
                    <button type="button" onClick={handleSendSignupOtp} disabled={otpSending} className="text-[10px] font-semibold" style={{ color: "var(--brand-primary)" }} data-testid="resend-signup-otp-btn">
                      Resend OTP
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Mobile */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
              Mobile Number <span style={{ color: "var(--text-muted)" }}>(Optional)</span>
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "var(--text-muted)" }} />
              <span className="absolute left-9 top-1/2 -translate-y-1/2 text-sm" style={{ color: "var(--text-muted)" }}>+91</span>
              <input
                type="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                onBlur={() => handleBlur("mobile", mobile)}
                placeholder="10 digit number"
                className="w-full pl-16 pr-3 py-2.5 rounded-lg text-sm outline-none transition-all"
                style={inputStyle("mobile")}
                data-testid="mobile-input"
              />
            </div>
            {touched.mobile && errors.mobile && (
              <p className="mt-1 text-xs" style={{ color: "var(--status-error)" }}>{errors.mobile}</p>
            )}
          </div>

          {/* Sex Selection */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
              Sex <span style={{ color: "var(--status-error)" }}>*</span>
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setSex("male"); setTouched(prev => ({ ...prev, sex: true })); }}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-all"
                style={{
                  backgroundColor: sex === "male" ? "var(--brand-primary)" : "var(--bg-subtle)",
                  color: sex === "male" ? "white" : "var(--text-secondary)",
                  border: touched.sex && !sex ? "1px solid var(--status-error)" : "1px solid var(--border-light)"
                }}
                data-testid="sex-male-btn"
              >
                Male
              </button>
              <button
                type="button"
                onClick={() => { setSex("female"); setTouched(prev => ({ ...prev, sex: true })); }}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-all"
                style={{
                  backgroundColor: sex === "female" ? "var(--brand-primary)" : "var(--bg-subtle)",
                  color: sex === "female" ? "white" : "var(--text-secondary)",
                  border: touched.sex && !sex ? "1px solid var(--status-error)" : "1px solid var(--border-light)"
                }}
                data-testid="sex-female-btn"
              >
                Female
              </button>
            </div>
            {touched.sex && !sex && (
              <p className="mt-1 text-xs" style={{ color: "var(--status-error)" }}>Please select your sex</p>
            )}
          </div>

          {/* Date of Birth */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
              Date of Birth <span style={{ color: "var(--status-error)" }}>*</span>
            </label>
            <RestrictedDatePicker
              value={dateOfBirth}
              onChange={(date) => { setDateOfBirth(date); setTouched(prev => ({ ...prev, dateOfBirth: true })); }}
              maxDate={today}
              placeholder="Select date of birth"
              error={touched.dateOfBirth && !dateOfBirth}
              testId="dob-input"
            />
            {touched.dateOfBirth && !dateOfBirth && (
              <p className="mt-1 text-xs" style={{ color: "var(--status-error)" }}>Date of birth is required</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
              Password <span style={{ color: "var(--status-error)" }}>*</span>
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "var(--text-muted)" }} />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => handleBlur("password", password)}
                placeholder="Create a strong password"
                className="w-full pl-10 pr-10 py-2.5 rounded-lg text-sm outline-none transition-all"
                style={inputStyle("password")}
                data-testid="password-input"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
                ) : (
                  <Eye className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
                )}
              </button>
            </div>
            
            {/* Password Strength Meter */}
            {password && (
              <div className="mt-2">
                <div className="flex gap-1 mb-1">
                  {[1, 2, 3].map((level) => (
                    <div
                      key={level}
                      className="h-1 flex-1 rounded-full transition-colors"
                      style={{
                        backgroundColor: passwordStrength.level >= level ? passwordStrength.color : "var(--border-light)"
                      }}
                    />
                  ))}
                </div>
                <p className="text-xs" style={{ color: passwordStrength.color }}>
                  Password Strength: {passwordStrength.label}
                </p>
              </div>
            )}
            
            {/* Password Requirements */}
            <div className="mt-2 space-y-1">
              <p className="text-xs flex items-center gap-1" style={{ color: passwordChecks.length ? "var(--status-success)" : "var(--text-muted)" }}>
                {passwordChecks.length ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                At least 8 characters
              </p>
              <p className="text-xs flex items-center gap-1" style={{ color: passwordChecks.uppercase ? "var(--status-success)" : "var(--text-muted)" }}>
                {passwordChecks.uppercase ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                At least 1 uppercase letter
              </p>
              <p className="text-xs flex items-center gap-1" style={{ color: passwordChecks.number ? "var(--status-success)" : "var(--text-muted)" }}>
                {passwordChecks.number ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                At least 1 number
              </p>
              <p className="text-xs flex items-center gap-1" style={{ color: passwordChecks.special ? "var(--status-success)" : "var(--text-muted)" }}>
                {passwordChecks.special ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                At least 1 special character
              </p>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
              Confirm Password <span style={{ color: "var(--status-error)" }}>*</span>
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "var(--text-muted)" }} />
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onBlur={() => handleBlur("confirmPassword", confirmPassword)}
                placeholder="Confirm your password"
                className="w-full pl-10 pr-10 py-2.5 rounded-lg text-sm outline-none transition-all"
                style={inputStyle("confirmPassword", confirmPassword && password === confirmPassword)}
                data-testid="confirm-password-input"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
                ) : (
                  <Eye className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
                )}
              </button>
            </div>
            {touched.confirmPassword && confirmPassword && password !== confirmPassword && (
              <p className="mt-1 text-xs" style={{ color: "var(--status-error)" }}>
                Passwords do not match
              </p>
            )}
            {confirmPassword && password === confirmPassword && (
              <p className="mt-1 text-xs" style={{ color: "var(--status-success)" }}>
                Passwords match
              </p>
            )}
          </div>

          {/* Invite Code Section */}
          <div className="p-4 rounded-xl" style={{ backgroundColor: "var(--bg-subtle)" }}>
            {!showInviteField ? (
              <button
                type="button"
                onClick={() => setShowInviteField(true)}
                className="w-full text-sm font-medium flex items-center justify-center gap-2 py-1"
                style={{ color: "var(--brand-primary)" }}
                data-testid="show-invite-code-btn"
              >
                <Users className="h-4 w-4" />
                Have an invite code?
              </button>
            ) : (
              <div>
                <p className="text-xs font-medium mb-2" style={{ color: "var(--text-muted)" }}>
                  INVITE / REFERRAL CODE
                </p>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="Enter invite code (optional)"
                  className="w-full px-4 py-2.5 rounded-lg text-sm outline-none uppercase tracking-widest font-mono text-center"
                  style={{
                    backgroundColor: "var(--bg-card)",
                    border: inviteInfo ? "1px solid var(--status-success)" : "1px solid var(--border-light)",
                    color: "var(--text-primary)"
                  }}
                  data-testid="invite-code-input"
                />
                {checkingInvite && (
                  <div className="flex items-center gap-2 mt-2">
                    <Loader2 className="h-3 w-3 animate-spin" style={{ color: "var(--text-muted)" }} />
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>Checking code...</span>
                  </div>
                )}
                {inviteInfo && (
                  <div className="mt-2 p-3 rounded-lg flex items-center gap-3" style={{ backgroundColor: "#DCFCE7", border: "1px solid #BBF7D0" }} data-testid="invite-info-card">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #7C3AED, #A78BFA)" }}>
                      <Users className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold" style={{ color: "#166534" }}>{inviteInfo.familyName}</p>
                      <p className="text-[10px]" style={{ color: "#15803D" }}>
                        Invited by {inviteInfo.ownerName}
                        {inviteInfo.pendingMember?.relationship && ` as ${inviteInfo.pendingMember.relationship}`}
                      </p>
                    </div>
                    <Check className="h-5 w-5" style={{ color: "#16A34A" }} />
                  </div>
                )}
                {inviteCode.length >= 4 && !checkingInvite && !inviteInfo && (
                  <p className="mt-1 text-xs" style={{ color: "var(--status-warning)" }}>
                    Code not found — you can still register and join later
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!isFormValid() || isSubmitting}
            className="w-full py-3 rounded-xl font-semibold text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: "var(--brand-primary)" }}
            data-testid="register-button"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Creating Account...
              </>
            ) : (
              "Create Account"
            )}
          </button>
        </form>

        {/* Back to Login */}
        <p className="text-center mt-4 text-sm" style={{ color: "var(--text-secondary)" }}>
          Already have an account?{" "}
          <button
            onClick={onBackToLogin}
            className="font-semibold hover:underline"
            style={{ color: "var(--brand-primary)" }}
          >
            Sign In
          </button>
        </p>
      </div>
    </div>
  );
};

export default RegisterForm;
