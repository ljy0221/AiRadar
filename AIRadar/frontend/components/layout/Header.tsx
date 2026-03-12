import Link from 'next/link';
import { ThemeToggle } from '../common';

export const Header = () => {
  return (
    <header className="w-full flex justify-between items-center py-6 px-8 md:px-16 border-b border-gray-200 dark:border-gray-800 bg-[var(--color-bg-primary)] sticky top-0 z-50 backdrop-blur-md bg-opacity-80 dark:bg-opacity-80">
      <div className="flex items-center">
        <Link href="/" className="text-2xl font-bold tracking-tight">
          로고
        </Link>
      </div>
      <nav className="hidden md:flex items-center gap-10">
         <Link href="/dashboard" className="text-base font-semibold text-[color:var(--color-accent)] hover:opacity-80 transition-opacity">대쉬보드</Link>
         <Link href="/jobs" className="text-base font-medium text-[color:var(--color-text-primary)] hover:text-[color:var(--color-accent)] transition-colors">직업용</Link>
         <Link href="/news" className="text-base font-medium text-[color:var(--color-text-primary)] hover:text-[color:var(--color-accent)] transition-colors">뉴스</Link>
         <ThemeToggle />
      </nav>
      {/* TODO: Add mobile menu toggle if needed */}
      <div className="md:hidden flex items-center gap-4">
        <ThemeToggle />
        {/* Placeholder for menu icon */}
      </div>
    </header>
  );
};
