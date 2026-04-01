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
  const shouldBeTransparent = false;

  return (
    <>
      <style>{`
        /* 사이버 헤더 고유 스타일 */
        .cyber-header-bg {
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, 
            rgba(0, 212, 200, 0.03) 0%, 
            transparent 50%, 
            rgba(0, 212, 200, 0.03) 100%
          );
          pointer-events: none;
          z-index: -1;
        }
        
        .cyber-header-grid {
          position: absolute;
          inset: 0;
          background-image: linear-gradient(rgba(0, 212, 200, 0.05) 1px, transparent 1px);
          background-size: 100% 4px;
          pointer-events: none;
          z-index: -1;
          opacity: 0.5;
        }

        .cyber-nav-active {
          position: relative;
        }

        .cyber-nav-active::after {
          content: '';
          position: absolute;
          bottom: -2px;
          left: 0;
          width: 100%;
          height: 2px;
          background: var(--color-accent);
          box-shadow: 0 0 12px var(--color-accent), 0 0 20px var(--color-accent);
          transition: all 0.3s ease;
        }
        
        .cyber-corner {
          position: absolute;
          width: 8px;
          height: 8px;
          border: 1.5px solid var(--color-accent);
          opacity: 0.6;
          pointer-events: none;
        }
        
        .cyber-corner-tl { top: 0; left: 0; border-right: none; border-bottom: none; }
        .cyber-corner-tr { top: 0; right: 0; border-left: none; border-bottom: none; }
        .cyber-corner-bl { bottom: 0; left: 0; border-right: none; border-top: none; }
        .cyber-corner-br { bottom: 0; right: 0; border-left: none; border-top: none; }

        @keyframes glitch-text {
          0% { clip-path: inset(40% 0 61% 0); transform: translate(-2px, 2px); }
          20% { clip-path: inset(92% 0 1% 0); transform: translate(1px, -3px); }
          40% { clip-path: inset(43% 0 1% 0); transform: translate(-1px, 2px); }
          60% { clip-path: inset(25% 0 58% 0); transform: translate(3px, 1px); }
          80% { clip-path: inset(54% 0 7% 0); transform: translate(-2px, -3px); }
          100% { clip-path: inset(58% 0 43% 0); transform: translate(1px, 2px); }
        }

        .hover-glitch:hover span:last-child {
          animation: glitch-text 0.4s infinite linear alternate-reverse;
          opacity: 0.75;
          display: block;
        }
      `}</style>

      <Disclosure
        as="nav"
        className={classNames(
          "sticky top-0 z-50 w-full transition-all duration-300",
          shouldBeTransparent
            ? "bg-black/10 backdrop-blur-sm border-b border-white/5 shadow-none"
            : "bg-[var(--color-bg-primary)]/90 backdrop-blur-xl border-b border-[var(--color-accent)]/30 shadow-[0_4px_30px_rgba(0,212,200,0.15)]"
        )}
      >
        <div className="cyber-header-bg" />
        <div className="cyber-header-grid" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative">
          <div className="relative flex h-14 items-center justify-between">
            <div className="absolute inset-y-0 left-0 flex items-center sm:hidden">
              <DisclosureButton className="group relative inline-flex items-center justify-center rounded-md p-2 text-[var(--color-text-primary)] hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none transition-colors">
                <span className="sr-only">Open main menu</span>
                <Bars3Icon aria-hidden="true" className="block size-6 group-data-open:hidden" />
                <XMarkIcon aria-hidden="true" className="hidden size-6 group-data-open:block" />
              </DisclosureButton>
            </div>

            <div className="flex flex-1 items-center justify-center sm:items-stretch sm:justify-start">
              <div className="flex shrink-0 items-center">
                  <Link
                    href="/"
                    draggable={false}
                    className={classNames(
                      "font-audiowide text-2xl tracking-tighter transition-all relative hover:scale-105 active:scale-95 group select-none",
                      mounted && resolvedTheme === 'dark' && "animate-cyber-glow",
                      shouldBeTransparent ? "text-white" : "text-[var(--color-text-primary)]"
                    )}
                    style={{ fontFamily: 'var(--font-audiowide-next)' }}
                  >
                  <span className="relative z-10">AI RADAR</span>
                  {mounted && resolvedTheme === 'dark' && (
                    <div className="absolute -inset-2 bg-[var(--color-accent)]/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </Link>
              </div>

              <div className="hidden sm:ml-10 sm:block">
                <div className="flex space-x-6 h-14 items-center">
                  {navigation.map((item) => {
                    const isCurrent = pathname.startsWith(item.href);
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        draggable={false}
                        className={classNames(
                          isCurrent
                            ? 'text-[var(--color-accent)] font-bold cyber-nav-active'
                            : shouldBeTransparent
                              ? 'text-white/70 hover:text-white'
                              : 'text-[var(--color-text-primary)]/80 hover:text-[var(--color-accent)]',
                          'h-14 px-2 text-sm font-semibold transition-all duration-200 uppercase tracking-widest flex items-center animate-glitch select-none',
                        )}
                      >
                        {item.name}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-4">
                <Popover className="relative">
                  <PopoverButton
                    className={classNames(
                      "p-2 rounded-lg border transition-all duration-200 flex items-center justify-center hover:bg-[var(--color-accent)]/10 active:scale-90 group focus:outline-none",
                      isLoggedIn && user
                        ? "bg-[var(--color-accent)] text-white border-transparent"
                        : shouldBeTransparent
                          ? "bg-white/5 hover:bg-white/10 text-white border-white/10"
                          : "bg-transparent text-[var(--color-text-primary)] border-gray-200 dark:border-gray-800"
                    )}
                  >
                    {isLoggedIn && user ? (
                      <div className="size-5 flex items-center justify-center select-none font-bold">
                        {userInitial}
                      </div>
                    ) : (
                      <User className="size-5" />
                    )}
                  </PopoverButton>

                  <Transition
                    enter="transition duration-150 ease-out"
                    enterFrom="opacity-0 translate-y-2 scale-95"
                    enterTo="opacity-100 translate-y-0 scale-100"
                    leave="transition duration-100 ease-in"
                    leaveFrom="opacity-100 translate-y-0 scale-100"
                    leaveTo="opacity-0 translate-y-2 scale-95"
                  >
                    <PopoverPanel className="absolute right-0 z-50 mt-3 w-64 origin-top-right rounded-2xl bg-white/95 dark:bg-[#11121A]/95 backdrop-blur-2xl py-2 shadow-2xl border border-gray-200 dark:border-[var(--color-accent)]/20">
                      {isLoggedIn && user ? (
                        <>
                          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 mb-2">
                            <p className="text-lg font-bold truncate">{user.nickname || user.name}</p>
                            <p className="text-xs text-gray-500 truncate mt-0.5">{user.email}</p>
                          </div>
                          <PopoverButton
                            as={Link}
                            href="/profile"
                            className="flex items-center gap-3 px-6 py-3 text-sm font-semibold hover:bg-[var(--color-accent)]/10 hover:text-[var(--color-accent)] transition-all"
                          >
                            <User className="size-4" /> 프로필 설정
                          </PopoverButton>
                          <div className="my-2 border-t border-gray-100 dark:border-gray-800" />
                          <PopoverButton
                            as="button"
                            onClick={() => setIsLogoutModalOpen(true)}
                            className="flex items-center gap-3 w-full px-6 py-3 text-sm font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all text-left"
                          >
                            <LogOut className="size-4" /> 로그아웃
                          </PopoverButton>
                        </>
                      ) : (
                        <div className="p-4">
                          <p className="text-sm font-bold mb-4">AI RADAR 시스템 접근</p>
                          <PopoverButton
                            onClick={() => openAuthModal('login')}
                            className="w-full bg-[var(--color-accent)] text-white py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:brightness-110 mb-2 transition-all"
                          >
                            <LogIn className="size-4" /> 로그인
                          </PopoverButton>
                          <PopoverButton
                            onClick={() => openAuthModal('signup')}
                            className="w-full bg-gray-100 dark:bg-gray-800 py-2.5 rounded-xl font-bold text-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
                          >
                            무료 계정 생성
                          </PopoverButton>
                        </div>
                      )}
                    </PopoverPanel>
                  </Transition>
                </Popover>

                <div className="h-4 w-px bg-gray-200 dark:bg-gray-800 mx-1 opacity-50"></div>
                <ThemeToggle
                  className={shouldBeTransparent ? "border-white/10 text-white hover:bg-white/5" : ""}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 모바일 메뉴 패널 */}
        <DisclosurePanel className="sm:hidden border-t border-[var(--color-accent)]/20 bg-[var(--color-bg-primary)]/95 backdrop-blur-xl">
          <div className="space-y-1 px-4 py-3">
            {navigation.map((item) => {
              const isCurrent = pathname.startsWith(item.href);
              return (
                <DisclosureButton
                  key={item.name}
                  as={Link}
                  href={item.href}
                  className={classNames(
                    isCurrent
                      ? 'bg-[var(--color-accent)]/10 text-[var(--color-accent)] font-bold'
                      : 'text-[var(--color-text-primary)]/70 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-[var(--color-accent)]',
                    'block rounded-xl px-4 py-3 text-base font-semibold transition-all'
                  )}
                >
                  {item.name}
                </DisclosureButton>
              );
            })}
          </div>

          <div className="border-t border-gray-100 dark:border-gray-800 px-4 py-6">
            {isLoggedIn && user ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 px-2 mb-2">
                  <div className="size-10 rounded-xl bg-[var(--color-accent)] text-white flex items-center justify-center font-bold text-lg shadow-lg shadow-[var(--color-accent)]/20">
                    {userInitial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{user.nickname || user.name}</p>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <DisclosureButton
                    as={Link}
                    href="/profile"
                    className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-semibold bg-gray-50 dark:bg-gray-800/50 hover:bg-[var(--color-accent)]/5 hover:text-[var(--color-accent)] transition-all"
                  >
                    <Settings className="size-4" /> 프로필 설정
                  </DisclosureButton>
                  <DisclosureButton
                    as="button"
                    onClick={() => setIsLogoutModalOpen(true)}
                    className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-semibold text-red-500 bg-red-50/50 dark:bg-red-500/5 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
                  >
                    <LogOut className="size-4" /> 로그아웃
                  </DisclosureButton>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                <DisclosureButton
                  as="button"
                  onClick={() => openAuthModal('login')}
                  className="flex items-center justify-center gap-2 w-full bg-[var(--color-accent)] text-white py-3.5 rounded-xl font-bold hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-[var(--color-accent)]/20"
                >
                  <LogIn className="size-5" /> 로그인
                </DisclosureButton>
                <DisclosureButton
                  as="button"
                  onClick={() => openAuthModal('signup')}
                  className="flex items-center justify-center gap-2 w-full bg-gray-100 dark:bg-gray-800 py-3.5 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-700 active:scale-95 transition-all text-[var(--color-text-primary)]"
                >
                  <UserPlus className="size-5" /> 무료 계정 생성
                </DisclosureButton>
              </div>
            )}
          </div>

          <div className="border-t border-gray-100 dark:border-gray-800 px-4 py-4 flex items-center justify-between bg-gray-50/50 dark:bg-black/20">
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Theme Mode</span>
            </div>
            <div className="text-[10px] font-bold text-gray-400 dark:text-gray-600">v1.2.0</div>
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
