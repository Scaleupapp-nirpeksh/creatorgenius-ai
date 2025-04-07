"use client";

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  type: ToastType;
  message: string;
  duration?: number;
  onClose?: () => void;
}

// Icons for the toast messages
const SuccessIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
  </svg>
);

const ErrorIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
  </svg>
);

const WarningIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
  </svg>
);

const InfoIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
  </svg>
);

const CloseIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
  </svg>
);

export const Toast = ({ type, message, duration = 5000, onClose }: ToastProps) => {
  const [isVisible, setIsVisible] = useState(true);
  const [progress, setProgress] = useState(100);
  
  // Define styles based on toast type
  const typeStyles = {
    success: 'bg-green-50 text-green-800 border-green-500 dark:bg-green-900/20 dark:text-green-300',
    error: 'bg-red-50 text-red-800 border-red-500 dark:bg-red-900/20 dark:text-red-300',
    warning: 'bg-amber-50 text-amber-800 border-amber-500 dark:bg-amber-900/20 dark:text-amber-300',
    info: 'bg-blue-50 text-blue-800 border-blue-500 dark:bg-blue-900/20 dark:text-blue-300',
  };
  
  const iconMap = {
    success: <SuccessIcon />,
    error: <ErrorIcon />,
    warning: <WarningIcon />,
    info: <InfoIcon />,
  };
  
  const progressBarColors = {
    success: 'bg-green-500 dark:bg-green-400',
    error: 'bg-red-500 dark:bg-red-400',
    warning: 'bg-amber-500 dark:bg-amber-400',
    info: 'bg-blue-500 dark:bg-blue-400',
  };
  
  useEffect(() => {
    let timer: NodeJS.Timeout;
    let progressTimer: NodeJS.Timeout;
    
    if (duration > 0) {
      // Handle closing after duration
      timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => {
          if (onClose) onClose();
        }, 300); // Wait for animation to complete
      }, duration);
      
      // Handle progress bar
      const progressInterval = 10; // Update every 10ms
      const decrementAmount = (progressInterval / duration) * 100;
      
      progressTimer = setInterval(() => {
        setProgress((prev) => {
          if (prev <= 0) return 0;
          return prev - decrementAmount;
        });
      }, progressInterval);
    }
    
    return () => {
      clearTimeout(timer);
      clearInterval(progressTimer);
    };
  }, [duration, onClose]);
  
  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      if (onClose) onClose();
    }, 300); // Wait for animation to complete
  };
  
  return (
    <div
      className={`
        max-w-sm w-full shadow-lg rounded-lg pointer-events-auto border-l-4 
        transition-all duration-300 ease-in-out
        ${typeStyles[type]}
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
      `}
      role="alert"
    >
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            {iconMap[type]}
          </div>
          <div className="ml-3 w-0 flex-1 pt-0.5">
            <p className="text-sm font-medium">{message}</p>
          </div>
          <div className="ml-4 flex-shrink-0 flex">
            <button
              className="inline-flex rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              onClick={handleClose}
            >
              <span className="sr-only">Close</span>
              <CloseIcon />
            </button>
          </div>
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="h-1 w-full bg-gray-200 dark:bg-gray-700 rounded-b-lg overflow-hidden">
        <div 
          className={`h-full ${progressBarColors[type]} transition-all duration-linear ease-linear`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

// Toast container to keep the toasts stacked
interface ToastContainerProps {
  children: React.ReactNode;
}

export const ToastContainer = ({ children }: ToastContainerProps) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted) return null;

  // Create a portal to place the toasts at the top of the document body
  return createPortal(
    <div
      aria-live="polite"
      aria-atomic="true"
      className="fixed inset-0 z-50 flex flex-col items-end p-4 space-y-4 pointer-events-none sm:p-6"
    >
      {children}
    </div>,
    document.body
  );
};

// Toast context for global toast management
interface ToastContextProps {
  showToast: (type: ToastType, message: string, duration?: number) => void;
}

export const ToastContext = React.createContext<ToastContextProps>({
  showToast: () => {},
});

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (type: ToastType, message: string, duration = 5000) => {
    const id = Math.random().toString(36).substring(2, 11);
    setToasts((prev) => [...prev, { id, type, message, duration }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastContainer>
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            type={toast.type}
            message={toast.message}
            duration={toast.duration}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </ToastContainer>
    </ToastContext.Provider>
  );
};

// Hook to use toast
export const useToast = () => {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export default { Toast, ToastContainer, ToastProvider, useToast };