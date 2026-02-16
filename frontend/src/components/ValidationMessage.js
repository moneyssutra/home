import { AlertCircle, AlertTriangle } from "lucide-react";

/**
 * Validation Message Component
 * Displays error or warning messages consistently
 */
export const ValidationMessage = ({ message, type = "error" }) => {
  if (!message) return null;
  
  const isWarning = type === "warning";
  const Icon = isWarning ? AlertTriangle : AlertCircle;
  
  return (
    <div 
      className={`flex items-start gap-2 mt-1.5 text-sm ${
        isWarning ? "text-amber-600" : "text-red-500"
      }`}
      role="alert"
    >
      <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" />
      <span>{typeof message === 'object' ? message.message : message}</span>
    </div>
  );
};

/**
 * Validated Input wrapper
 * Adds red border and error message to any input
 */
export const ValidatedInput = ({ 
  children, 
  error, 
  warning,
  className = "" 
}) => {
  const hasError = !!error;
  const hasWarning = !!warning && !hasError;
  
  return (
    <div className={className}>
      <div className={`
        ${hasError ? '[&>input]:border-red-500 [&>input]:focus:border-red-500 [&>input]:focus:ring-red-500/20' : ''}
        ${hasWarning ? '[&>input]:border-amber-500 [&>input]:focus:border-amber-500 [&>input]:focus:ring-amber-500/20' : ''}
        ${hasError ? '[&>select]:border-red-500' : ''}
        ${hasWarning ? '[&>select]:border-amber-500' : ''}
        ${hasError ? '[&>button]:border-red-500' : ''}
        ${hasWarning ? '[&>button]:border-amber-500' : ''}
      `}>
        {children}
      </div>
      {hasError && <ValidationMessage message={error} type="error" />}
      {hasWarning && <ValidationMessage message={warning} type="warning" />}
    </div>
  );
};

/**
 * Form validation summary
 * Shows all errors at once
 */
export const ValidationSummary = ({ errors }) => {
  if (!errors || Object.keys(errors).length === 0) return null;
  
  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
      <div className="flex items-center gap-2 text-red-700 font-medium mb-2">
        <AlertCircle className="w-5 h-5" />
        <span>Please fix the following errors:</span>
      </div>
      <ul className="list-disc list-inside text-sm text-red-600 space-y-1">
        {Object.entries(errors).map(([field, message]) => (
          <li key={field}>
            {typeof message === 'object' ? message.message : message}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ValidationMessage;
