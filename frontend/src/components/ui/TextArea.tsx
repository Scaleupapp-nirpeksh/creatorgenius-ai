// frontend/src/components/ui/TextArea.tsx
import React, { useState } from 'react';

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  error?: string;
  fullWidth?: boolean;
  className?: string;
  textareaClassName?: string;
  labelClassName?: string;
  rows?: number;
  maxLength?: number;
  showCharCount?: boolean;
}

export const TextArea = ({
  label,
  helperText,
  error,
  fullWidth = true,
  className = '',
  textareaClassName = '',
  labelClassName = '',
  disabled,
  required,
  id,
  rows = 4,
  maxLength,
  showCharCount = false,
  value = '',
  onChange,
  ...props
}: TextAreaProps) => {
  const [focused, setFocused] = useState(false);
  const [currentValue, setCurrentValue] = useState(value?.toString() || '');
  
  // Generate a random id if not provided
  const textareaId = id || `textarea-${Math.random().toString(36).substring(2, 11)}`;
  
  // Handle change to track character count
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCurrentValue(e.target.value);
    if (onChange) {
      onChange(e);
    }
  };
  
  // Base container styles
  const containerClasses = `
    relative ${fullWidth ? 'w-full' : 'w-auto'}
    ${className}
  `;
  
  // Base textarea styles
  const textareaClasses = `
    block w-full px-3 py-2 bg-white dark:bg-neutral-900
    border ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : focused ? 'border-primary-500 focus:border-primary-500 focus:ring-primary-500' : 'border-neutral-300 dark:border-neutral-700 focus:border-primary-500 focus:ring-primary-500'}
    text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500
    rounded-md shadow-sm
    focus:outline-none focus:ring-1
    disabled:opacity-60 disabled:cursor-not-allowed
    transition-colors duration-200
    ${textareaClassName}
  `;
  
  // Label styles
  const labelClasses = `
    block text-sm font-medium mb-1
    ${error ? 'text-red-500' : 'text-neutral-700 dark:text-neutral-300'}
    ${labelClassName}
  `;

  // Helper text with char count
  const showHelperWithCount = maxLength && showCharCount;
  const charCount = currentValue.length;
  const charCountText = `${charCount}/${maxLength}`;
  
  return (
    <div className={containerClasses}>
      {label && (
        <label htmlFor={textareaId} className={labelClasses}>
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </label>
      )}
      
      <div className="relative">
        <textarea
          id={textareaId}
          disabled={disabled}
          required={required}
          className={textareaClasses}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          rows={rows}
          maxLength={maxLength}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${textareaId}-error` : helperText ? `${textareaId}-helper` : undefined}
          value={value}
          onChange={handleChange}
          {...props}
        />
      </div>
      
      {error && (
        <p id={`${textareaId}-error`} className="mt-1 text-sm text-red-500">
          {error}
        </p>
      )}
      
      {!error && (
        <div className="mt-1 flex justify-between items-center">
          {helperText && (
            <p id={`${textareaId}-helper`} className="text-sm text-neutral-500 dark:text-neutral-400">
              {helperText}
            </p>
          )}
          
          {showHelperWithCount && (
            <p className={`text-xs ${charCount === maxLength ? 'text-amber-500' : 'text-neutral-500 dark:text-neutral-400'}`}>
              {charCountText}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default TextArea;