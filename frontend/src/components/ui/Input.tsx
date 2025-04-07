// frontend/src/components/ui/Input.tsx
"use client";

import React, { useState } from 'react';

interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  className?: string;
  inputClassName?: string;
  labelClassName?: string;
}

export const Input = ({
  label,
  helperText,
  error,
  leftIcon,
  rightIcon,
  fullWidth = true,
  className = '',
  inputClassName = '',
  labelClassName = '',
  disabled,
  required,
  id,
  ...props
}: InputFieldProps) => {
  const [focused, setFocused] = useState(false);
  
  // Generate a random id if not provided
  const inputId = id || `input-${Math.random().toString(36).substring(2, 11)}`;
  
  // Base container styles
  const containerClasses = `
    relative ${fullWidth ? 'w-full' : 'w-auto'}
    ${className}
  `;
  
  // Base input styles
  const inputClasses = `
    block px-3 py-2 bg-white dark:bg-neutral-900
    border ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : focused ? 'border-primary-500 focus:border-primary-500 focus:ring-primary-500' : 'border-neutral-300 dark:border-neutral-700 focus:border-primary-500 focus:ring-primary-500'}
    text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500
    rounded-md shadow-sm
    focus:outline-none focus:ring-1
    disabled:opacity-60 disabled:cursor-not-allowed
    transition-colors duration-200
    ${leftIcon ? 'pl-10' : ''}
    ${rightIcon ? 'pr-10' : ''}
    ${inputClassName}
  `;
  
  // Label styles
  const labelClasses = `
    block text-sm font-medium mb-1
    ${error ? 'text-red-500' : 'text-neutral-700 dark:text-neutral-300'}
    ${labelClassName}
  `;
  
  return (
    <div className={containerClasses}>
      {label && (
        <label htmlFor={inputId} className={labelClasses}>
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </label>
      )}
      
      <div className="relative">
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-neutral-500">
            {leftIcon}
          </div>
        )}
        
        <input
          id={inputId}
          disabled={disabled}
          required={required}
          className={inputClasses}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
          {...props}
        />
        
        {rightIcon && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-neutral-500">
            {rightIcon}
          </div>
        )}
      </div>
      
      {error && (
        <p id={`${inputId}-error`} className="mt-1 text-sm text-red-500">
          {error}
        </p>
      )}
      
      {!error && helperText && (
        <p id={`${inputId}-helper`} className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          {helperText}
        </p>
      )}
    </div>
  );
};

export default Input;