'use client';

import { useState } from 'react';
import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ThemeToggle } from '../common';
import { AuthModal } from '../features/auth/AuthModal';
import { useAuth } from '../features/auth/AuthContext';

const navigation = [
  { name: '대시보드', href: '/dashboard' },
  { name: '직업', href: '/jobs' },
  { name: '뉴스', href: '/news' },
];

function classNames(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ');
}

export const Header = () => {
  const pathname = usePathname();
  const { isLoggedIn, logoutState } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  return (
    <>
      <Disclosure
        as="nav"
        className="sticky top-0 z-50 w-full bg-[var(--color-bg-primary)] border-none shadow-none backdrop-blur-md bg-opacity-80 dark:bg-opacity-80 transition-colors"
      >
        <div className="mx-auto max-w-7xl px-2 sm:px-6 lg:px-8">
          <div className="relative flex h-16 items-center justify-between">
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
                <Link href="/" className="font-serif text-2xl font-normal tracking-tight text-[var(--color-text-primary)] hover:opacity-80 transition-opacity">
                  AI Radar
                </Link>
              </div>
              <div className="hidden sm:ml-6 sm:block">
                <div className="flex space-x-4 h-16 items-center">
                  {navigation.map((item) => {
                    const isCurrent = pathname.startsWith(item.href);
                    return (
                      <div key={item.name} className="relative h-full flex items-center">
                        <Link
                          href={item.href}
                          aria-current={isCurrent ? 'page' : undefined}
                          className={classNames(
                            isCurrent
                              ? 'text-[var(--color-accent)] font-bold'
                              : 'text-[var(--color-text-primary)] hover:text-[var(--color-accent)]',
                            'rounded-md px-3 py-2 text-base transition-colors',
                          )}
                        >
                          {item.name}
                        </Link>
                        {isCurrent && (
                          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[8px] border-b-[var(--color-accent)] z-50">
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="absolute inset-y-0 right-0 flex items-center pr-2 sm:static sm:inset-auto sm:ml-6 sm:pr-0">
              <div className="flex items-center gap-4">
                {isLoggedIn ? (
                  <button
                    onClick={() => logoutState()}
                    className="text-sm font-bold text-white bg-[var(--color-accent)] hover:opacity-90 transition-all px-6 py-2 rounded-full shadow-[0_4px_12px_rgba(var(--color-accent-rgb),0.3)]"
                  >
                    로그아웃
                  </button>
                ) : (
                  <button
                    onClick={() => setIsAuthModalOpen(true)}
                    className="text-sm font-bold text-white bg-[var(--color-accent)] hover:opacity-90 transition-all px-6 py-2 rounded-full shadow-[0_4px_12px_rgba(var(--color-accent-rgb),0.3)]"
                  >
                    로그인
                  </button>
                )}
                <div className="h-6 w-px bg-gray-200 dark:bg-gray-800 mx-1 hidden sm:block"></div>
                <ThemeToggle />
                      >
                        {item.name}
                      </Link>
                    </div>
                  );
                })}
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
                      ? 'text-[var(--color-accent)] font-bold bg-gray-50 dark:bg-gray-800/50'
                      : 'text-[var(--color-text-primary)] hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-[var(--color-accent)]',
                    'block rounded-md px-3 py-2 text-base transition-colors',
                  )}
                >
                  {item.name}
                </DisclosureButton>
              );
            })}
            <div className="pt-4 pb-2 border-t border-gray-100 dark:border-gray-800 mt-2">
              {isLoggedIn ? (
                <DisclosureButton
                  as="button"
                  onClick={() => logoutState()}
                  className="block w-full text-left rounded-md px-3 py-2 text-base font-medium text-[var(--color-text-primary)] hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-[var(--color-accent)] transition-colors"
                >
                  로그아웃
                </DisclosureButton>
              ) : (
                <DisclosureButton
                  as="button"
                  onClick={() => setIsAuthModalOpen(true)}
                  className="block w-full text-left rounded-md px-3 py-2 text-base font-bold text-[var(--color-accent)] hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  로그인
                </DisclosureButton>
              )}
            </div>
          </div>
        </DisclosurePanel>
      </Disclosure>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </>
  );
};
