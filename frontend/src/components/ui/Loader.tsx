// frontend/src/components/ui/Loader.tsx
import React from 'react';

type LoaderSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
type LoaderType = 'spinner' | 'dots' | 'pulse' | 'skeleton';

interface LoaderProps {
  size?: LoaderSize;
  type?: LoaderType;
  text?: string;
  fullScreen?: boolean;
  className?: string;
  color?: string;
}

// Utility function to get size based on size prop
const getSize = (size: LoaderSize): string => {
  switch (size) {
    case 'xs':
      return 'w-4 h-4';
    case 'sm':
      return 'w-6 h-6';
    case 'md':
      return 'w-8 h-8';
    case 'lg':
      return 'w-12 h-12';
    case 'xl':
      return 'w-16 h-16';
    default:
      return 'w-8 h-8';
  }
};

// Spinner component (circular loading indicator)
const Spinner = ({ size, className, color }: { size: LoaderSize; className?: string; color?: string }) => {
  return (
    <div 
      className={`
        ${getSize(size)} 
        border-4 rounded-full 
        border-neutral-200 dark:border-neutral-700 
        ${color ? `border-t-${color}` : 'border-t-primary-500'} 
        animate-spin 
        ${className || ''}
      `}
    />
  );
};

// Dots component (three dots bouncing)
const Dots = ({ size, className, color }: { size: LoaderSize; className?: string; color?: string }) => {
  const dotSize = {
    xs: 'w-1 h-1',
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-3 h-3',
    xl: 'w-4 h-4',
  };
  
  const gap = {
    xs: 'gap-1',
    sm: 'gap-1.5',
    md: 'gap-2',
    lg: 'gap-3',
    xl: 'gap-4',
  };
  
  return (
    <div className={`flex ${gap[size]} items-center ${className || ''}`}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={`
            ${dotSize[size]} 
            rounded-full 
            ${color ? `bg-${color}` : 'bg-primary-500'} 
            animate-bounce
          `}
          style={{ 
            animationDelay: `${i * 0.15}s`,
            animationDuration: '0.6s'
          }}
        />
      ))}
    </div>
  );
};

// Pulse component (circle that pulses)
const Pulse = ({ size, className, color }: { size: LoaderSize; className?: string; color?: string }) => {
  return (
    <div className={`relative ${getSize(size)} ${className || ''}`}>
      <div 
        className={`
          absolute inset-0 
          rounded-full 
          ${color ? `bg-${color}` : 'bg-primary-500'} 
          opacity-75 
          animate-ping
        `} 
      />
      <div 
        className={`
          relative rounded-full 
          ${getSize(size)} 
          ${color ? `bg-${color}` : 'bg-primary-500'}
        `} 
      />
    </div>
  );
};

// Skeleton component (placeholder that shimmers)
const Skeleton = ({ 
  className,
  width = 'w-full',
  height = 'h-4',
}: { 
  className?: string;
  width?: string;
  height?: string;
}) => {
  return (
    <div 
      className={`
        skeleton
        ${width} ${height} 
        rounded 
        ${className || ''}
      `} 
    />
  );
};

export const Loader = ({
  size = 'md',
  type = 'spinner',
  text,
  fullScreen = false,
  className = '',
  color,
}: LoaderProps) => {
  // Choose loader based on type
  const renderLoader = () => {
    switch (type) {
      case 'spinner':
        return <Spinner size={size} color={color} />;
      case 'dots':
        return <Dots size={size} color={color} />;
      case 'pulse':
        return <Pulse size={size} color={color} />;
      case 'skeleton':
        return <Skeleton />;
      default:
        return <Spinner size={size} color={color} />;
    }
  };
  
  // Full screen overlay for blocking UI during loading
  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-black/20 backdrop-blur-sm z-50">
        <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-xl p-6 flex flex-col items-center">
          {renderLoader()}
          {text && (
            <p className="mt-4 text-neutral-700 dark:text-neutral-300 font-medium">
              {text}
            </p>
          )}
        </div>
      </div>
    );
  }
  
  // Regular inline loader
  return (
    <div className={`flex flex-col items-center ${className}`}>
      {renderLoader()}
      {text && (
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
          {text}
        </p>
      )}
    </div>
  );
};

// Skeleton component for placeholder content
export const SkeletonLoader = ({
  rows = 1,
  rowHeight = 'h-4',
  gap = 'gap-2',
  className = '',
}: {
  rows?: number;
  rowHeight?: string;
  gap?: string;
  className?: string;
}) => {
  return (
    <div className={`flex flex-col ${gap} ${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} height={rowHeight} />
      ))}
    </div>
  );
};

// Export as components for different use cases
export const ContentLoader = {
  Spinner,
  Dots,
  Pulse,
  Skeleton,
};

export default Loader;