'use client';

import { Dialog, DialogPanel, Transition, TransitionChild } from '@headlessui/react';
import { LogOut, X } from 'lucide-react';
import { Button } from '@/components/common/Button';

interface LogoutConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const LogoutConfirmModal = ({ isOpen, onClose, onConfirm }: LogoutConfirmModalProps) => {
  return (
    <Transition show={isOpen} as="div">
      <Dialog onClose={onClose} className="relative z-[60]">
        {/* Backdrop */}
        <TransitionChild
          as="div"
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity" />
        </TransitionChild>

        <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <TransitionChild
              as="div"
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95 translate-y-4"
              enterTo="opacity-100 scale-100 translate-y-0"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100 translate-y-0"
              leaveTo="opacity-0 scale-95 translate-y-4"
            >
              <DialogPanel className="w-full max-w-sm transform overflow-hidden rounded-2xl bg-[var(--color-bg-primary)] p-8 shadow-2xl transition-all border border-gray-100 dark:border-gray-800">
                <button
                  onClick={onClose}
                  className="absolute top-6 right-6 p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all z-20"
                >
                  <X className="h-5 w-5" />
                </button>

                <div className="text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/10 mb-6">
                    <LogOut className="h-7 w-7 text-red-500" />
                  </div>
                  
                  <h2 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)] mb-2">
                    로그아웃
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
                    정말 로그아웃 하시겠습니까?<br />
                    세션이 종료되며 메인 페이지로 이동합니다.
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="ghost"
                      onClick={onClose}
                      className="border border-gray-200 dark:border-gray-700 font-bold py-3 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      취소
                    </Button>
                    <Button
                      variant="primary"
                      onClick={() => {
                        onConfirm();
                        onClose();
                      }}
                      className="bg-red-500 hover:bg-red-600 text-white font-bold py-3 shadow-sm shadow-red-200 dark:shadow-none"
                    >
                      로그아웃
                    </Button>
                  </div>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};
