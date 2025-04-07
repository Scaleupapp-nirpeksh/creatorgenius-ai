// frontend/src/components/ui/Card.tsx
import React from 'react';

interface CardProps {
  className?: string;
  hoverEffect?: boolean;
  children: React.ReactNode;
}

export const Card = ({ 
  className = '', 
  hoverEffect = true, 
  children 
}: CardProps) => {
  return (
    <div 
      className={`
        bg-white dark:bg-neutral-800 
        rounded-lg overflow-hidden 
        border border-neutral-200 dark:border-neutral-700
        shadow-sm 
        ${hoverEffect ? 'transition-all duration-200 hover:shadow-md transform hover:-translate-y-1' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
};

interface CardHeaderProps {
  className?: string;
  children: React.ReactNode;
}

export const CardHeader = ({ className = '', children }: CardHeaderProps) => {
  return (
    <div className={`px-5 py-4 border-b border-neutral-200 dark:border-neutral-700 ${className}`}>
      {children}
    </div>
  );
};

interface CardTitleProps {
  className?: string;
  children: React.ReactNode;
}

export const CardTitle = ({ className = '', children }: CardTitleProps) => {
  return (
    <h3 className={`text-lg font-semibold text-neutral-800 dark:text-neutral-100 ${className}`}>
      {children}
    </h3>
  );
};

interface CardDescriptionProps {
  className?: string;
  children: React.ReactNode;
}

export const CardDescription = ({ className = '', children }: CardDescriptionProps) => {
  return (
    <p className={`mt-1 text-sm text-neutral-500 dark:text-neutral-400 ${className}`}>
      {children}
    </p>
  );
};

interface CardContentProps {
  className?: string;
  children: React.ReactNode;
}

export const CardContent = ({ className = '', children }: CardContentProps) => {
  return (
    <div className={`px-5 py-4 ${className}`}>
      {children}
    </div>
  );
};

interface CardFooterProps {
  className?: string;
  children: React.ReactNode;
}

export const CardFooter = ({ className = '', children }: CardFooterProps) => {
  return (
    <div className={`px-5 py-4 bg-neutral-50 dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-700 ${className}`}>
      {children}
    </div>
  );
};

export default Object.assign(Card, {
  Header: CardHeader,
  Title: CardTitle,
  Description: CardDescription,
  Content: CardContent,
  Footer: CardFooter
});