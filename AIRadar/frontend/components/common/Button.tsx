import { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'ghost';
  children: ReactNode;
}

export const Button = ({ variant = 'primary', className = '', children, ...props }: ButtonProps) => {
  const baseStyle = "px-6 py-3 rounded-md font-semibold transition-colors flex items-center justify-center gap-2";
  const variants = {
    primary: "bg-[var(--color-accent)] text-white hover:opacity-90 dark:text-[var(--color-bg-primary)] dark:font-bold",
    outline: "border-2 border-[var(--color-accent)] text-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-white dark:hover:text-[var(--color-bg-primary)]",
    ghost: "bg-transparent text-[var(--color-text-primary)] hover:bg-gray-100 dark:hover:bg-gray-800"
  };

  return (
    <button className={`${baseStyle} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};
