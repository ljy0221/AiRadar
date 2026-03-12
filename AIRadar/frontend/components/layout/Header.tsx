'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ThemeToggle } from '../common';

export const Header = () => {
  const pathname = usePathname();

  const getLinkClass = (path: string) => {
    const isActive = pathname.startsWith(path);
    return `text-base transition-colors ${
      isActive 
        ? 'font-bold text-[var(--color-accent)]' 
        : 'font-medium text-[var(--color-text-primary)] hover:text-[var(--color-accent)]'
    }`;
  };

  return (
    <header className="w-full flex justify-between items-center py-6 px-8 md:px-16 border-b border-gray-200 dark:border-gray-800 bg-[var(--color-bg-primary)] sticky top-0 z-50 backdrop-blur-md bg-opacity-80 dark:bg-opacity-80">
      <div className="flex items-center">
        <Link href="/" className="text-2xl font-bold tracking-tight hover:opacity-80 transition-opacity">
          로고
        </Link>
      </div>
      <nav className="hidden md:flex items-center gap-10">
         <Link href="/dashboard" className={getLinkClass('/dashboard')}>대시보드</Link>
         <Link href="/jobs" className={getLinkClass('/jobs')}>직업</Link>
         <Link href="/news" className={getLinkClass('/news')}>뉴스</Link>
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
