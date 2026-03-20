'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogPanel, Transition, TransitionChild } from '@headlessui/react';
import { Mail, Lock, User, Eye, EyeOff, ArrowRight, X, Loader2 } from 'lucide-react';
import { useAuth } from './AuthContext';
import { authApi } from '../../../services/auth/authApi';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialView?: 'login' | 'signup';
}

export const AuthModal = ({ isOpen, onClose, initialView = 'login' }: AuthModalProps) => {
  const { loginState } = useAuth();
  const [isLoginView, setIsLoginView] = useState(initialView === 'login');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [initialViewApplied, setInitialViewApplied] = useState(false);

  // Sync internal view state with initialView prop when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsLoginView(initialView === 'login');
      setError('');
      setName('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
    }
  }, [isOpen, initialView]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!isLoginView && password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      setIsLoading(false);
      return;
    }

    try {
      let res: any;
      if (isLoginView) {
        res = await authApi.login({ email, password });
      } else {
        res = await authApi.register({ name, email, password });
      }

      if (res.accessToken) {
        loginState(res.accessToken);
        onClose();
      }
    } catch (err: any) {
      console.error('Auth error full object:', err.response?.data);
      const serverMessage = err.response?.data?.message || err.response?.data?.error?.message;
      setError(serverMessage || '인증에 실패했습니다. 입력 정보를 확인해 주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleView = () => {
    setIsLoginView(!isLoginView);
    setError('');
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <Transition show={isOpen} as="div">
      <Dialog onClose={onClose} className="relative z-50">
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
              <DialogPanel className="w-full max-w-md transform overflow-hidden rounded-xl bg-[var(--color-bg-primary)] p-8 shadow-2xl transition-all border border-gray-100 dark:border-gray-800">
                <button
                  onClick={onClose}
                  className="absolute top-6 right-6 p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all z-20"
                >
                  <X className="h-5 w-5" />
                </button>

                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)] mb-2">
                    {isLoginView ? '로그인' : '회원가입'}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {isLoginView ? 'AI Radar 계정으로 로그인하세요' : '새로운 계정을 만들어 시작하세요'}
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="">
                  {error && (
                    <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 text-red-600 dark:text-red-400 text-xs font-medium py-3 px-4 rounded-xl text-center mb-[20px]">
                      {error}
                    </div>
                  )}

                  {!isLoginView && (
                    <div className="mb-[20px]">
                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1 mb-[6px]">이름</label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <User className="h-4 w-4 text-gray-400 group-focus-within:text-[var(--color-accent)] transition-colors" />
                        </div>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="block w-full pl-11 pr-5 py-3 bg-[var(--color-bg-primary)] border border-gray-300 dark:border-gray-700 rounded-xl focus:ring-1 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] transition-all outline-none text-sm placeholder:text-gray-400 dark:placeholder:text-gray-600"
                          placeholder="성함을 입력하세요"
                          required
                        />
                      </div>
                    </div>
                  )}

                  <div className="mb-[20px]">
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1 mb-[6px]">이메일</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Mail className="h-4 w-4 text-gray-400 group-focus-within:text-[var(--color-accent)] transition-colors" />
                      </div>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="block w-full pl-11 pr-5 py-3 bg-[var(--color-bg-primary)] border border-gray-300 dark:border-gray-700 rounded-xl focus:ring-1 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] transition-all outline-none text-sm placeholder:text-gray-400 dark:placeholder:text-gray-600"
                        placeholder="이메일 주소를 입력하세요"
                        required
                      />
                    </div>
                  </div>

                  <div className="mb-[20px]">
                    <div className="flex items-center justify-between ml-1 mb-[6px]">
                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">비밀번호</label>
                      {isLoginView && (
                        <button type="button" tabIndex={-1} className="text-[11px] font-bold text-[var(--color-accent)] hover:underline opacity-80 hover:opacity-100">
                          비밀번호 찾기
                        </button>
                      )}
                    </div>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Lock className="h-4 w-4 text-gray-400 group-focus-within:text-[var(--color-accent)] transition-colors" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="block w-full pl-11 pr-12 py-3 bg-[var(--color-bg-primary)] border border-gray-300 dark:border-gray-700 rounded-xl focus:ring-1 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] transition-all outline-none text-sm placeholder:text-gray-400 dark:placeholder:text-gray-600"
                        placeholder="비밀번호를 입력하세요"
                        required
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {!isLoginView && (
                    <div className="mb-[20px]">
                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1 mb-[6px]">비밀번호 확인</label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Lock className="h-4 w-4 text-gray-400 group-focus-within:text-[var(--color-accent)] transition-colors" />
                        </div>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="block w-full pl-11 pr-12 py-3 bg-[var(--color-bg-primary)] border border-gray-300 dark:border-gray-700 rounded-xl focus:ring-1 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] transition-all outline-none text-sm placeholder:text-gray-400 dark:placeholder:text-gray-600"
                          placeholder="비밀번호를 한번 더 입력하세요"
                          required
                        />
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-[var(--color-accent)] text-white font-bold py-3.5 rounded-xl shadow-sm hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group mt-8 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        {isLoginView ? '로그인' : '회원가입 완료'}
                      </>
                    )}
                  </button>
                </form>

                <p className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
                  {isLoginView ? '계정이 없으신가요?' : '이미 계정이 있으신가요?'} {' '}
                  <button
                    onClick={toggleView}
                    className="font-bold text-[var(--color-accent)] hover:underline ml-1"
                  >
                    {isLoginView ? '회원가입' : '로그인'}
                  </button>
                </p>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};
