import { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
}

export const Button = ({ 
  variant = 'primary', 
  size = 'md',
  className = '', 
  children, 
  ...props 
}: ButtonProps) => {
  const baseStyle = "font-medium transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shrink-0";
  
  const sizes = {
    sm: "px-2.5 py-1 text-[11px]",
    md: "px-3.5 py-1.5 text-xs",
    lg: "px-6 py-3 text-base"
  };

  const variants = {
    primary: "bg-[var(--color-accent)] text-white hover:opacity-90 dark:text-[var(--color-bg-primary)] dark:font-bold",
    outline: "border border-[var(--color-accent)] text-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-white dark:hover:text-[var(--color-bg-primary)]",
    ghost: "bg-transparent text-[var(--color-text-primary)] hover:bg-gray-100 dark:hover:bg-gray-800"
  };

  return (
    <button className={`${baseStyle} ${sizes[size]} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};
