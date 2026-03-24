'use client';

import { useState, useEffect } from 'react';
import { Disclosure, DisclosureButton, DisclosurePanel, Popover, PopoverButton, PopoverPanel, Transition } from '@headlessui/react';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import { User, Settings, LogOut, LogIn, UserPlus, Mail, PlusCircle } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ThemeToggle } from '../common';
import { AuthModal } from '../features/auth/AuthModal';
import { LogoutConfirmModal } from '../features/auth/LogoutConfirmModal';
import { useAuth } from '../features/auth/AuthContext';
import { useUserQuery } from '@/hooks/queries/useUserQuery';
import { useTheme } from 'next-themes';

const navigation = [
  { name: '대시보드', href: '/dashboard' },
  { name: '직업', href: '/jobs' },
  { name: '뉴스', href: '/news' },
  { name: '논문', href: '/papers' },
];

function classNames(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ');
}

export const Header = () => {
  const pathname = usePathname();
  const { isLoggedIn, logoutState, setOnboardingCompleted } = useAuth();
  const { data: user } = useUserQuery();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [authView, setAuthView] = useState<'login' | 'signup'>('login');
  const [isScrolled, setIsScrolled] = useState(false);
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const openAuthModal = (view: 'login' | 'signup' = 'login') => {
    setAuthView(view);
    setIsAuthModalOpen(true);
  };

  const userInitial = user?.nickname?.charAt(0).toUpperCase() || user?.name?.charAt(0).toUpperCase() || '?';
  const isHomePage = pathname === '/';
  const shouldBeTransparent = isHomePage && !isScrolled;

  return (
    <>
      <Disclosure
        as="nav"
        className={classNames(
          "sticky top-0 z-50 w-full transition-all duration-300",
          shouldBeTransparent
            ? "bg-transparent border-none"
            : "bg-[var(--color-bg-primary)]/80 backdrop-blur-md border-none shadow-none"
        )}
      >
        <div className="mx-auto max-w-7xl px-2 sm:px-6 lg:px-8">
          <div className="relative flex h-14 items-center justify-between">
            <div className="absolute inset-y-0 left-0 flex items-center sm:hidden">
              <DisclosureButton className="group relative inline-flex items-center justify-center rounded-md p-2 text-[var(--color-text-primary)] hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none transition-colors">
                <span className="absolute -inset-0.5" />
                <span className="sr-only">Open main menu</span>
                <Bars3Icon aria-hidden="true" className="block size-6 group-data-open:hidden" />
                <XMarkIcon aria-hidden="true" className="hidden size-6 group-data-open:block" />
              </DisclosureButton>
            </div>
            <div className="flex flex-1 items-center justify-center sm:items-stretch sm:justify-start">
              <div className="flex shrink-0 items-center">
                <Link
                  href="/"
                  className={classNames(
                    "font-audiowide text-2xl tracking-tight transition-all",
                    shouldBeTransparent
                      ? (mounted && (theme === 'dark' || resolvedTheme === 'dark') ? "text-white" : "text-gray-900 dark:text-white")
                      : "text-[var(--color-text-primary)] hover:opacity-80"
                  )}
                  style={{ fontFamily: 'var(--font-audiowide-next)' }}
                >
                  AI RADAR
                </Link>
              </div>
              <div className="hidden sm:ml-6 sm:block">
                <div className="flex space-x-4 h-14 items-center">
                  {navigation.map((item) => {
                    const isCurrent = pathname.startsWith(item.href);
                    return (
                      <div key={item.name} className="relative h-full flex items-center">
                        <Link
                          href={item.href}
                          aria-current={isCurrent ? 'page' : undefined}
                          className={classNames(
                            isCurrent
                              ? 'text-[var(--color-accent)] font-semibold'
                              : shouldBeTransparent
                                ? (mounted && (theme === 'dark' || resolvedTheme === 'dark') ? 'text-white/80 hover:text-white' : 'text-gray-600 hover:text-gray-900 dark:text-white/80 dark:hover:text-white')
                                : 'text-[var(--color-text-primary)] hover:text-[var(--color-accent)]',
                            'rounded-md px-3 py-2 text-base transition-colors',
                          )}
                        >
                          {item.name}
                        </Link>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="absolute inset-y-0 right-0 flex items-center pr-2 sm:static sm:inset-auto sm:ml-6 sm:pr-0">
              <div className="hidden sm:flex items-center gap-4">
                <Popover className="relative">
                  <PopoverButton
                    className={classNames(
                      "p-2 rounded-full border shadow-sm transition-all duration-200 flex items-center justify-center hover:scale-110 active:scale-95 group focus:outline-none",
                      isLoggedIn && user
                        ? "bg-[var(--color-accent)] text-white text-base font-semibold border-transparent"
                        : shouldBeTransparent
                          ? (mounted && (theme === 'dark' || resolvedTheme === 'dark')
                            ? "bg-white/10 hover:bg-white/20 text-white border-white/20"
                            : "bg-black/5 hover:bg-black/10 text-gray-900 border-black/10")
                          : "bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 text-[var(--color-text-primary)] border-gray-200 dark:border-gray-700"
                    )}
                  >
                    <span className="sr-only">Open user menu</span>
                    {isLoggedIn && user ? (
                      <div className="size-5 flex items-center justify-center select-none leading-none">
                        {userInitial}
                      </div>
                    ) : (
                      <User className={classNames(
                        "size-5 transition-colors",
                        shouldBeTransparent
                          ? (mounted && (theme === 'dark' || resolvedTheme === 'dark') ? "text-white group-hover:text-white" : "text-gray-900 group-hover:text-gray-900")
                          : "text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)]"
                      )} />
                    )}
                  </PopoverButton>

                  <Transition
                    enter="transition ease-out duration-100"
                    enterFrom="transform opacity-0 scale-95"
                    enterTo="transform opacity-100 scale-100"
                    leave="transition ease-in duration-75"
                    leaveFrom="transform opacity-100 scale-100"
                    leaveTo="transform opacity-0 scale-95"
                  >
                    <PopoverPanel className="absolute right-0 z-50 mt-2 w-56 origin-top-right rounded-3xl bg-white dark:bg-[#1a1c2e] py-2 shadow-2xl ring-1 ring-black/5 dark:ring-white/5 focus:outline-none backdrop-blur-xl bg-opacity-95 dark:bg-opacity-95 overflow-hidden transition-all border border-gray-100 dark:border-gray-800">
                      {isLoggedIn && user ? (
                        <>
                          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 mb-2">
                            <p className="text-lg font-semibold text-[var(--color-text-primary)] truncate">{user.nickname || user.name}</p>
                            <div className="flex items-center mt-1 text-xs text-gray-500 dark:text-gray-400 truncate">
                              <Mail className="size-3 mr-1.5 shrink-0" />
                              <span className="truncate">{user.email}</span>
                            </div>
                          </div>
                          <PopoverButton
                            as={Link}
                            href="/profile"
                            className="flex items-center gap-3 px-6 py-3.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-[var(--color-accent)] transition-all group"
                          >
                            <User className="size-5 text-gray-400 group-hover:text-[var(--color-accent)] transition-colors" />
                            마이페이지
                          </PopoverButton>
                          <div className="mx-4 my-2 border-t border-gray-100 dark:border-gray-800" />
                          <PopoverButton
                            as="button"
                            onClick={() => setIsLogoutModalOpen(true)}
                            className="flex items-center gap-3 w-full px-6 py-3.5 text-sm font-semibold text-[var(--color-accent)] hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all group text-left"
                          >
                            <LogOut className="size-5" />
                            로그아웃
                          </PopoverButton>
                        </>
                      ) : (
                        <>
                          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 mb-2">
                            <p className="text-lg font-semibold text-[var(--color-text-primary)]">AI Radar</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">로그인이 필요합니다</p>
                          </div>
                          <PopoverButton
                            as="button"
                            onClick={() => openAuthModal('login')}
                            className="flex items-center gap-3 w-full px-6 py-3.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-[var(--color-accent)] transition-all group text-left outline-none"
                          >
                            <LogIn className="size-5 text-gray-400 group-hover:text-[var(--color-accent)] transition-colors" />
                            로그인
                          </PopoverButton>
                          <PopoverButton
                            as="button"
                            onClick={() => openAuthModal('signup')}
                            className="flex items-center gap-3 w-full px-6 py-3.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-[var(--color-accent)] transition-all group text-left outline-none"
                          >
                            <PlusCircle className="size-5 text-gray-400 group-hover:text-[var(--color-accent)] transition-colors" />
                            회원가입
                          </PopoverButton>
                        </>
                      )}
                    </PopoverPanel>
                  </Transition>
                </Popover>
                <div className="h-6 w-px bg-gray-200 dark:bg-gray-800 mx-1"></div>
                <ThemeToggle
                  className={shouldBeTransparent
                    ? (mounted && (theme === 'dark' || resolvedTheme === 'dark') ? "border-white/20 hover:bg-white/10 text-white" : "border-black/10 hover:bg-black/5 text-gray-900")
                    : ""}
                />
              </div>
            </div>
          </div>
        </div>

        <DisclosurePanel className="sm:hidden">
          <div className="space-y-1 px-2 pt-2 pb-3">
            {navigation.map((item) => {
              const isCurrent = pathname.startsWith(item.href);
              return (
                <DisclosureButton
                  key={item.name}
                  as={Link}
                  href={item.href}
                  aria-current={isCurrent ? 'page' : undefined}
                  className={classNames(
                    isCurrent
                      ? 'text-[var(--color-accent)] font-semibold bg-gray-50 dark:bg-gray-800/50'
                      : 'text-[var(--color-text-primary)] hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-[var(--color-accent)]',
                    'flex items-center w-full rounded-md px-3 h-12 text-base transition-colors',
                  )}
                >
                  {item.name}
                </DisclosureButton>
              );
            })}

            {/* 로그인 / 로그아웃 영역도 동일한 간격 유지 (별도 테두리/여백 제외) */}
            {isLoggedIn ? (
              <>
                <div className="px-3 py-4 border-b border-gray-100 dark:border-gray-800 mb-2 flex items-center gap-3">
                  <div className="size-10 flex items-center justify-center rounded-full bg-[var(--color-accent)] text-white font-semibold text-lg select-none">
                    {userInitial}
                  </div>
                  <div>
                    <p className="text-base font-semibold text-[var(--color-text-primary)] truncate">{user?.nickname || user?.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
                  </div>
                </div>
                <DisclosureButton
                  as={Link}
                  href="/profile"
                  className="flex items-center gap-3 w-full text-left rounded-md px-3 h-12 text-base font-medium text-[var(--color-text-primary)] hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-[var(--color-accent)] transition-colors"
                >
                  <User className="size-5" />
                  마이페이지
                </DisclosureButton>
                <DisclosureButton
                  as="button"
                  onClick={() => setIsLogoutModalOpen(true)}
                  className="flex items-center gap-3 w-full text-left rounded-md px-3 h-12 text-base font-semibold text-[var(--color-accent)] hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all"
                >
                  <LogOut className="size-5" />
                  로그아웃
                </DisclosureButton>
              </>
            ) : (
              <>
                <DisclosureButton
                  as="button"
                  onClick={() => openAuthModal('login')}
                  className="flex items-center gap-3 w-full text-left rounded-md px-3 h-12 text-base font-semibold text-[var(--color-accent)] hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <LogIn className="size-5" />
                  로그인하기
                </DisclosureButton>
                <DisclosureButton
                  as="button"
                  onClick={() => openAuthModal('signup')}
                  className="flex items-center gap-3 w-full text-left rounded-md px-3 h-12 text-base font-semibold text-[var(--color-accent)] hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <PlusCircle className="size-5" />
                  무료로 가입하기
                </DisclosureButton>
              </>
            )}
          </div>
        </DisclosurePanel>
      </Disclosure>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialView={authView}
      />

      <LogoutConfirmModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={logoutState}
      />
    </>
  );
};
