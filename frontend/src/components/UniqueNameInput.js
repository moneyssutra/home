import { Check, X, Loader2 } from "lucide-react";

/**
 * UniqueNameInput - Input component with uniqueness validation feedback
 * 
 * @param {Object} props
 * @param {string} props.value - Current input value
 * @param {function} props.onChange - Change handler
 * @param {function} props.onBlur - Blur handler (triggers uniqueness check)
 * @param {string} props.placeholder - Input placeholder
 * @param {boolean} props.isChecking - Whether uniqueness check is in progress
 * @param {boolean|null} props.isUnique - Uniqueness status (null = not checked)
 * @param {string} props.error - Error message to display
 * @param {string} props.validationError - Field validation error (required, format, etc.)
 * @param {boolean} props.disabled - Whether input is disabled
 * @param {string} props.testId - data-testid attribute
 * @param {string} props.className - Additional CSS classes
 */
export const UniqueNameInput = ({
  value,
  onChange,
  onBlur,
  placeholder = "Enter name",
  isChecking = false,
  isUnique = null,
  error = "",
  validationError = "",
  disabled = false,
  testId = "unique-name-input",
  className = ""
}) => {
  // Determine border color based on state
  const getBorderColor = () => {
    if (validationError || error) return "var(--status-error)";
    if (isUnique === true && value.trim()) return "var(--status-success)";
    return "var(--border-light)";
  };

  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full px-4 py-3 pr-10 rounded-xl outline-none transition-all ${className}`}
        style={{
          backgroundColor: "var(--bg-subtle)",
          border: `1px solid ${getBorderColor()}`,
          color: "var(--text-primary)"
        }}
        data-testid={testId}
      />
      
      {/* Status indicator */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2">
        {isChecking && (
          <Loader2 
            className="h-5 w-5 animate-spin" 
            style={{ color: "var(--text-muted)" }} 
          />
        )}
        {!isChecking && isUnique === true && value.trim() && (
          <Check 
            className="h-5 w-5" 
            style={{ color: "var(--status-success)" }} 
          />
        )}
        {!isChecking && isUnique === false && (
          <X 
            className="h-5 w-5" 
            style={{ color: "var(--status-error)" }} 
          />
        )}
      </div>
      
      {/* Error messages */}
      {(validationError || error) && (
        <p 
          className="mt-1 text-sm" 
          style={{ color: "var(--status-error)" }}
        >
          {validationError || error}
        </p>
      )}
      
      {/* Success message */}
      {!validationError && !error && isUnique === true && value.trim() && (
        <p 
          className="mt-1 text-sm" 
          style={{ color: "var(--status-success)" }}
        >
          Name is available
        </p>
      )}
    </div>
  );
};

export default UniqueNameInput;
