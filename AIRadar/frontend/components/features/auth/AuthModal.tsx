'use client';

import { useState } from 'react';
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
      console.error('Auth error:', err);
      setError(err.response?.data?.message || '인증에 실패했습니다. 다시 시도해 주세요.');
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
              <DialogPanel className="w-full max-w-lg transform overflow-hidden rounded-[2.5rem] bg-white/80 dark:bg-[#1a1c2e]/90 backdrop-blur-2xl p-10 shadow-2xl transition-all border border-white/20 dark:border-gray-800/50">
                <button
                  onClick={onClose}
                  className="absolute top-8 right-8 p-2 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all z-20"
                >
                  <X className="h-6 w-6" />
                </button>

                {/* Decorative Background */}
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-[var(--color-accent)] to-transparent opacity-50" />

                <div className="text-center mb-10">
                  <h2 className="text-3xl font-bold tracking-tight text-[var(--color-text-primary)] mb-3">
                    {isLoginView ? '반가워요!' : '새로운 시작'}
                  </h2>
                  <p className="text-base text-gray-500 dark:text-gray-400">
                    {isLoginView ? 'AI Radar와 함께 트렌드를 선도하세요' : 'AI Radar의 일원이 되어 트렌드를 분석하세요'}
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm py-3 px-4 rounded-xl text-center animate-in fade-in slide-in-from-top-2 duration-300">
                      {error}
                    </div>
                  )}

                  {!isLoginView && (
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1">이름</label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <User className="h-5 w-5 text-gray-400 group-focus-within:text-[var(--color-accent)] transition-colors" />
                        </div>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="block w-full pl-12 pr-5 py-3.5 bg-white dark:bg-[#0A0B1A]/50 border border-gray-200 dark:border-gray-800 rounded-3xl focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)] transition-all outline-none text-base"
                          placeholder="홍길동"
                          required
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1">이메일</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-gray-400 group-focus-within:text-[var(--color-accent)] transition-colors" />
                      </div>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="block w-full pl-12 pr-5 py-3.5 bg-white dark:bg-[#0A0B1A]/50 border border-gray-200 dark:border-gray-800 rounded-3xl focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)] transition-all outline-none text-base"
                        placeholder="name@example.com"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between ml-1">
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">비밀번호</label>
                      {isLoginView && (
                        <button type="button" className="text-xs font-medium text-[var(--color-accent)] hover:underline">
                          잊으셨나요?
                        </button>
                      )}
                    </div>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-[var(--color-accent)] transition-colors" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="block w-full pl-12 pr-12 py-3.5 bg-white dark:bg-[#0A0B1A]/50 border border-gray-200 dark:border-gray-800 rounded-3xl focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)] transition-all outline-none text-base"
                        placeholder="••••••••"
                        required
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  {!isLoginView && (
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1">비밀번호 확인</label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-[var(--color-accent)] transition-colors" />
                        </div>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="block w-full pl-12 pr-12 py-3.5 bg-white dark:bg-[#0A0B1A]/50 border border-gray-200 dark:border-gray-800 rounded-3xl focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)] transition-all outline-none text-base"
                          placeholder="••••••••"
                          required
                        />
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-[var(--color-accent)] text-white font-bold py-4 rounded-3xl shadow-lg shadow-[var(--color-accent)]/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 group mt-6 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        처리 중...
                      </>
                    ) : (
                      <>
                        {isLoginView ? '로그인하기' : '회원가입 완료'}
                        <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>
                </form>

                <p className="mt-8 text-center text-base text-gray-600 dark:text-gray-400">
                  {isLoginView ? '계정이 없으신가요?' : '이미 계정이 있으신가요?'} {' '}
                  <button
                    onClick={toggleView}
                    className="font-bold text-[var(--color-accent)] hover:underline"
                  >
                    {isLoginView ? '무료로 가입하기' : '로그인하기'}
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
