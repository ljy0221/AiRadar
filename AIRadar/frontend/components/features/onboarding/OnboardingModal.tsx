'use client';

import { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import {
  Check, X, Sparkles, Rocket, Target, Cpu, Brain, Layers,
  ArrowRight, PlusCircle, Loader2, ChevronRight, Star, ChevronDown, Radar
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { userQueryKeys } from '../../../hooks/queries/useUserQuery';
import { userApi } from '../../../services/user/userApi';
import { AnimatePresence, motion, Variants } from 'framer-motion';

const ONBOARDING_KEYWORDS = [
  {
    category: '이론 & 개념',
    id: 'theory',
    icon: Brain,
    description: 'AI의 근간이 되는 핵심 원리와 최신 방법론',
    keywords: ['에이전틱 워크플로우', 'RAG', '멀티모달 AI', '파인튜닝', '프롬프트 엔지니어링', '강화학습', '신경망']
  },
  {
    category: '모델 & 서비스',
    id: 'models',
    icon: Layers,
    description: '현존하는 최강의 AI 모델들과 플랫폼',
    keywords: ['GPT-4o', 'Claude 3.5 Sonnet', 'Llama 3', 'Gemini', 'DALL-E', 'Sora', 'Hugging Face']
  },
  {
    category: '인프라 & 하드웨어',
    id: 'infra',
    icon: Cpu,
    description: 'AI를 가동하는 물리적 토대와 연산 장치',
    keywords: ['GPU', 'HBM', 'NPU', '반도체', '데이터센터', 'FPGA', 'TPU']
  },
  {
    category: '산업 & 응용',
    id: 'industry',
    icon: Target,
    description: 'AI가 실제로 혁신을 일으키고 있는 분야',
    keywords: ['자율주행', '로보틱스', 'AI 에이전트', '헬스케어', '핀테크', '에듀테크', '에너지']
  }
];

type OnboardingStep = 'intro' | 'focus' | 'explore' | 'analyzing' | 'result';

export const OnboardingModal = () => {
  const { isLoggedIn, isInitialized, userEmail, onboardingCompleted, setOnboardingCompleted } = useAuth();
  const [step, setStep] = useState<OnboardingStep>('intro');
  const [selectedFocus, setSelectedFocus] = useState<string | null>(null);
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  // 사용자 전환(이메일 변경) 시 온보딩 프로세스 완전 초기화
  useEffect(() => {
    setStep('intro');
    setSelectedFocus(null);
    setSelectedKeywords([]);
    setIsSubmitting(false);
  }, [userEmail]);

  // 초기화 중이거나 로그아웃 상태면 모달을 보여주지 않음
  if (!isInitialized || !isLoggedIn || onboardingCompleted) return null;

  const toggleKeyword = (keyword: string) => {
    setSelectedKeywords(prev =>
      prev.includes(keyword)
        ? prev.filter(k => k !== keyword)
        : prev.length < 10 ? [...prev, keyword] : prev
    );
  };

  const handleFocusSelect = (id: string) => {
    setSelectedFocus(id);
    setStep('explore');
  };

  const handleSubmit = async () => {
    if (selectedKeywords.length === 0) return;

    setStep('analyzing');
    setTimeout(async () => {
      setIsSubmitting(true);
      try {
        await userApi.completeOnboarding(selectedKeywords);
        queryClient.invalidateQueries({ queryKey: userQueryKeys.interests });
        setStep('result');
      } catch (error) {
        setStep('result');
      } finally {
        setIsSubmitting(false);
      }
    }, 2500);
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0, scale: 0.9, y: 30 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
    exit: { opacity: 0, scale: 1.1, y: -30, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } }
  };

  return (
    <Transition show={true} as="div">
      <Dialog onClose={() => { }} className="relative z-[100]">
        <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-lg transition-opacity overflow-hidden">
          {/* AI 감성의 다이나믹 오로라 배경 (모달 내부에 종속되도록 위치 조정 가능성 검토) */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.1, 0.2, 0.1],
                x: [0, 50, 0],
                y: [0, -30, 0]
              }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
              className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-[var(--color-accent)]/20 rounded-full blur-[120px]"
            />
          </div>
        </div>

        <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <AnimatePresence mode="wait">
              {/* --- STEP 1: INTRO --- */}
              {step === 'intro' && (
                <motion.div
                  key="step-intro"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="w-full max-w-md bg-white dark:bg-[#0b0c10] border border-gray-200 dark:border-white/10 rounded-[40px] md:rounded-[48px] p-8 sm:p-10 md:p-12 shadow-[0_32px_80px_rgba(0,0,0,0.5)] relative overflow-hidden text-center flex flex-col items-center mx-4"
                >
                  {/* 도트 형태의 모달 내부 배경 무늬 */}
                  <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(var(--color-text-primary)_1px,transparent_1px)] [background-size:20px_20px]" />

                  {/* 상단 스텝 인디케이터 - 시스템 컬러 적용 */}
                  <div className="flex gap-2 justify-center mb-8">
                    <div className="w-8 h-1.5 rounded-full bg-[var(--color-accent)] shadow-[0_0_8px_var(--color-accent)]/30 transition-all duration-500" />
                    <div className="w-3 h-1.5 rounded-full bg-gray-200 dark:bg-gray-800 transition-all duration-500" />
                    <div className="w-3 h-1.5 rounded-full bg-gray-200 dark:bg-gray-800 transition-all duration-500" />
                  </div>

                  <div className="relative z-10 w-full flex flex-col items-center">
                    {/* 메인 아이콘 - 서비스 상징인 Radar로 변경 */}
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.8, type: 'spring' }}
                      className="w-16 h-16 md:w-20 md:h-20 bg-[var(--color-accent)] rounded-[24px] flex items-center justify-center mb-8 shadow-2xl shadow-[var(--color-accent)]/20 relative cursor-default"
                    >
                      <Radar className="w-8 h-8 md:w-10 md:h-10 text-white" />
                      <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-white rounded-full border-[3px] border-[var(--color-accent)] transition-transform" />
                    </motion.div>

                    {/* 메인 타이틀 - 시스템 컬러 기반 그라데이션 */}
                    <h2 className="text-2xl sm:text-3xl font-black text-[var(--color-text-primary)] tracking-tight mb-4 leading-tight text-center">
                      당신만의 <span className="text-transparent bg-clip-text bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-accent)]/70">AI 인사이트를</span><br />
                      정교하게 설계합니다
                    </h2>

                    {/* 서브 설명 - 폰트 크기 축소 및 굵기 완화 */}
                    <p className="text-[var(--color-text-primary)]/40 font-medium text-xs md:text-sm max-w-[260px] mx-auto mb-12 leading-relaxed tracking-normal">
                      매일 쏟아지는 수만 개의 AI 소식 중,<br />
                      당신에게 꼭 필요한 것만 걸러낼게요.
                    </p>

                    {/* 하단 유도 버튼 - 캡슐형 디자인 적용 */}
                    <div className="flex flex-col items-center mt-8 mb-4 w-full">
                      <motion.button
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setStep('focus')}
                        className="w-full max-w-[280px] bg-[var(--color-text-primary)] dark:bg-white text-[var(--color-bg-primary)] dark:text-black font-black py-4 rounded-2xl shadow-xl hover:shadow-2xl hover:brightness-110 transition-all flex items-center justify-center gap-2 group text-base"
                      >
                        시작하기
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" />
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* --- STEP 2: FOCUS AREA --- */}
              {step === 'focus' && (
                <motion.div
                  key="step-focus"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="w-full max-w-5xl bg-[var(--color-bg-primary)]/40 dark:bg-white/[0.02] backdrop-blur-md rounded-[32px] md:rounded-[56px] p-6 sm:p-10 md:p-16 shadow-2xl border border-gray-200 dark:border-white/10"
                >
                  <div className="text-center mb-8 md:mb-16">
                    <span className="inline-block px-4 py-1.5 rounded-full bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20 text-[var(--color-accent)] text-[10px] md:text-xs font-black uppercase tracking-[0.2em] mb-4 md:mb-6">Phase 01 / 03</span>
                    <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-[var(--color-text-primary)] tracking-tight mb-3 md:mb-4">현재 가장 몰두하고 있는 분야는?</h2>
                    <p className="text-[var(--color-text-primary)]/60 text-base md:text-lg">메인 카테고리를 선택하여 AI 모델의 방향성을 설정해 주세요.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 md:gap-8 pr-1">
                    {ONBOARDING_KEYWORDS.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleFocusSelect(item.id)}
                          className="group relative flex items-start gap-4 sm:gap-6 md:gap-8 p-6 sm:p-8 md:p-10 bg-[var(--color-bg-primary)]/60 dark:bg-white/[0.03] hover:bg-white dark:hover:bg-white/[0.08] border border-gray-100 dark:border-white/5 hover:border-[var(--color-accent)]/50 rounded-[28px] md:rounded-[40px] transition-all text-left outline-none overflow-hidden"
                        >
                          <div className="flex-shrink-0 w-12 h-12 md:w-16 md:h-16 bg-[var(--color-bg-primary)] dark:bg-white/5 rounded-xl md:rounded-2xl flex items-center justify-center text-gray-400 group-hover:text-[var(--color-accent)] transition-all duration-500 shadow-sm group-hover:scale-110">
                            <Icon className="w-6 h-6 md:w-8 md:h-8" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-xl md:text-2xl font-bold text-[var(--color-text-primary)] mb-1 md:mb-2 group-hover:text-[var(--color-accent)] transition-colors">{item.category}</h3>
                            <p className="text-sm md:text-base text-[var(--color-text-primary)]/50 leading-relaxed font-medium line-clamp-2 md:line-clamp-none">{item.description}</p>
                          </div>
                          <div className="hidden sm:block absolute top-6 md:top-10 right-6 md:right-10 text-gray-300 dark:text-gray-600 group-hover:text-[var(--color-accent)] opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                            <ArrowRight className="w-5 h-5 md:w-6 md:h-6" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* --- STEP 3: EXPLORE & PREVIEW --- */}
              {step === 'explore' && (
                <motion.div
                  key="step-explore"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="w-full max-w-[1240px] bg-[var(--color-bg-primary)]/40 dark:bg-white/[0.02] backdrop-blur-md rounded-[32px] md:rounded-[56px] p-6 sm:p-10 md:p-16 shadow-2xl border border-gray-200 dark:border-white/10 mb-8 md:mb-12"
                >
                  <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 lg:gap-16">
                    {/* Left: Keywords */}
                    <div>
                      <div className="mb-8 md:mb-12">
                        <button onClick={() => setStep('focus')} className="text-[10px] md:text-xs font-black text-gray-400 hover:text-[var(--color-accent)] transition-colors flex items-center gap-2 mb-4 md:mb-6 group">
                          <ArrowRight size={14} className="rotate-180 group-hover:-translate-x-1 transition-transform" /> Back to Focus
                        </button>
                        <span className="inline-block px-4 py-1.5 rounded-full bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20 text-[var(--color-accent)] text-[10px] md:text-xs font-black uppercase tracking-[0.2em] mb-4 md:mb-6">Phase 02 / 03</span>
                        <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-[var(--color-text-primary)] tracking-tight mb-3 md:mb-4 leading-tight">세부 취향을 마킹해 주세요</h2>
                        <p className="text-[var(--color-text-primary)]/60 text-base md:text-lg">선택한 키워드에 따라 AI 엔진이 실시간으로 피드를 최적화합니다.</p>
                      </div>

                      <div className="space-y-8 md:space-y-12">
                        {ONBOARDING_KEYWORDS.map((group) => (
                          <div key={group.category} className="transition-opacity duration-300">
                            <h3 className="text-[10px] md:text-[11px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-[0.3em] mb-4 md:mb-6 flex items-center gap-4">
                              {group.category} <div className="h-[1px] flex-1 bg-gray-100 dark:bg-white/10" />
                            </h3>
                            <div className="flex flex-wrap gap-2 md:gap-3">
                              {group.keywords.map((keyword) => {
                                const isSelected = selectedKeywords.includes(keyword);
                                return (
                                  <button
                                    key={keyword}
                                    onClick={() => toggleKeyword(keyword)}
                                    className={`px-4 py-2.5 md:px-6 md:py-4 rounded-xl md:rounded-2xl text-sm md:text-[15px] font-bold transition-all border outline-none ${isSelected
                                      ? 'bg-[var(--color-accent)] border-[var(--color-accent)] text-white shadow-2xl shadow-[var(--color-accent)]/30 scale-105 ring-1 ring-[var(--color-accent)] ring-offset-2 dark:ring-offset-[#0b0c10]'
                                      : 'bg-gray-50/50 dark:bg-white/[0.05] border-gray-200 dark:border-white/5 text-gray-600 dark:text-gray-300 hover:border-[var(--color-accent)]/50 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-[var(--color-accent)]'
                                      }`}
                                  >
                                    {keyword}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Right: AI Prediction Preview (Glassmorphism Sidebar) */}
                    <div className="bg-[var(--color-bg-primary)]/60 dark:bg-white/[0.03] rounded-[32px] md:rounded-[40px] p-6 md:p-10 border border-gray-100 dark:border-white/10 flex flex-col shadow-inner relative overflow-hidden lg:h-full lg:sticky lg:top-0">
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[var(--color-accent)] to-transparent opacity-50" />

                      <div className="flex items-center justify-between mb-8 md:mb-10">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-[var(--color-accent)]/10 rounded-lg">
                            <Brain className="w-4 h-4 md:w-5 md:h-5 text-[var(--color-accent)]" />
                          </div>
                          <span className="text-[13px] md:text-sm font-black text-[var(--color-text-primary)] tracking-tight">AI 엔진 실시간 프리뷰</span>
                        </div>
                        <motion.div
                          animate={{ opacity: [1, 0.5, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="text-[9px] md:text-[10px] font-black px-2 md:px-2.5 py-1 rounded-full bg-green-500/10 text-green-500 uppercase tracking-widest border border-green-500/20"
                        >
                          Live
                        </motion.div>
                      </div>

                      <div className="flex-1 space-y-4 md:space-y-5">
                        {selectedKeywords.length === 0 ? (
                          <div className="h-48 lg:h-full flex flex-col items-center justify-center text-center p-6 md:p-8 border-2 border-dashed border-gray-200 dark:border-white/5 rounded-[24px] md:rounded-[32px]">
                            <PlusCircle className="w-6 h-6 md:w-8 md:h-8 text-gray-300 dark:text-white/10 mb-4 md:mb-6" />
                            <p className="text-xs md:text-sm font-bold text-gray-400 dark:text-gray-500 leading-relaxed px-4">키워드를 1개 이상 선택하면<br />큐레이션 모델이 가동됩니다</p>
                          </div>
                        ) : (
                          <AnimatePresence mode="popLayout">
                            {[...selectedKeywords].reverse().slice(0, 3).map((keyword, idx) => (
                              <motion.div
                                key={keyword}
                                initial={{ opacity: 0, x: 40, filter: 'blur(10px)' }}
                                animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                                exit={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
                                transition={{ type: "spring", damping: 20, stiffness: 100 }}
                                className="bg-[var(--color-bg-primary)] dark:bg-white/5 p-4 md:p-6 rounded-[24px] md:rounded-[28px] border border-gray-100 dark:border-white/5 relative group"
                              >
                                <div className="flex items-center gap-2 mb-2 md:mb-3">
                                  <span className="px-2 py-0.5 md:px-2.5 md:py-1 rounded-md bg-[var(--color-accent)] text-[8px] md:text-[9px] font-black text-white tracking-[0.2em] uppercase">Matching</span>
                                  <span className="text-[10px] md:text-[11px] font-bold text-gray-400 dark:text-gray-500">#{keyword}</span>
                                </div>
                                <h4 className="text-[13px] md:text-[15px] font-bold text-[var(--color-text-primary)] leading-snug line-clamp-2 group-hover:text-[var(--color-accent)] transition-colors">
                                  {keyword} 관련 최신 브리핑과 분석 리포트를 수집했습니다.
                                </h4>
                              </motion.div>
                            ))}
                          </AnimatePresence>
                        )}
                      </div>

                      <div className="mt-8 md:mt-12">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={handleSubmit}
                          disabled={selectedKeywords.length === 0}
                          className="w-full bg-[var(--color-accent)] text-white font-black py-4 md:py-5 rounded-2xl shadow-2xl shadow-[var(--color-accent)]/30 hover:brightness-110 transition-all flex items-center justify-center gap-3 disabled:opacity-30 disabled:grayscale text-base md:text-lg"
                        >
                          엔진 최적화 완료
                          <ArrowRight className="w-5 h-5 md:w-6 md:h-6" />
                        </motion.button>
                        <div className="flex justify-between items-center mt-4 px-2 text-[var(--color-text-primary)]/40">
                          <p className="text-[10px] md:text-[11px] font-black uppercase tracking-widest">{selectedKeywords.length} / 10</p>
                          <div className="w-24 md:w-32 h-1 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                            <motion.div
                              className="h-full bg-[var(--color-accent)]"
                              initial={{ width: 0 }}
                              animate={{ width: `${(selectedKeywords.length / 10) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* --- STEP 4: ANALYZING --- */}
              {step === 'analyzing' && (
                <motion.div
                  key="step-analyzing"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="w-full max-w-md bg-[var(--color-bg-primary)]/40 dark:bg-white/[0.02] backdrop-blur-md rounded-[40px] md:rounded-[56px] p-10 sm:p-16 md:p-20 shadow-2xl border border-gray-200 dark:border-white/10 text-center mx-4"
                >
                  <div className="relative w-32 h-32 md:w-40 md:h-40 mx-auto mb-8 md:mb-12">
                    {/* Rotating Rings */}
                    <motion.div
                      className="absolute inset-0 border-2 border-dashed border-[var(--color-accent)]/20 rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
                    />
                    <motion.div
                      className="absolute inset-4 border-2 border-[var(--color-accent)]/40 rounded-full border-t-transparent"
                      animate={{ rotate: -360 }}
                      transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                    />
                    <motion.div
                      className="absolute inset-8 border-[4px] md:border-[6px] border-[var(--color-accent)] rounded-full border-t-transparent"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Brain className="w-12 h-12 md:w-16 md:h-16 text-[var(--color-accent)] animate-pulse" />
                    </div>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-black text-[var(--color-text-primary)] mb-3 md:mb-4 tracking-tight">알고리즘 최적화 중</h2>
                  <div className="h-6 overflow-hidden">
                    <AnimatePresence mode="wait">
                      <motion.p
                        key={Date.now()}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        className="text-[var(--color-accent)] font-black text-xs md:text-sm uppercase tracking-[0.2em]"
                      >
                        당신의 데이터를 학습하고 있습니다
                      </motion.p>
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}

              {/* --- STEP 5: RESULT --- */}
              {step === 'result' && (
                <motion.div
                  key="step-result"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="w-full max-w-2xl bg-[var(--color-bg-primary)]/40 dark:bg-white/[0.02] backdrop-blur-md rounded-[40px] md:rounded-[56px] p-8 sm:p-12 md:p-16 shadow-2xl border border-gray-200 dark:border-white/10 text-center mx-4"
                >
                  <div className="w-20 h-20 md:w-28 md:h-28 bg-green-500/10 rounded-[24px] md:rounded-[32px] flex items-center justify-center mx-auto mb-8 md:mb-10 shadow-2xl shadow-green-500/20 rotate-12">
                    <Check className="w-12 h-12 md:w-16 md:h-16 text-green-500" strokeWidth={4} />
                  </div>
                  <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-[var(--color-text-primary)] tracking-tight mb-4 md:mb-6 leading-[1.15] md:leading-tight">
                    커스텀 AI Radar<br className="hidden sm:block" /><span className="text-green-500">엔진 가동 준비 완료</span>
                  </h2>
                  <p className="text-[var(--color-text-primary)]/60 font-medium text-lg md:text-xl max-w-sm mx-auto mb-10 md:mb-16 leading-relaxed px-4 sm:px-0">
                    선택하신 {selectedKeywords.length}개의 키워드를 기반으로<br className="hidden sm:block" />전혀 새로운 인사이트를 탐험해 보세요.
                  </p>
                  <button
                    onClick={() => setOnboardingCompleted(true)}
                    className="w-full max-w-xs bg-[var(--color-text-primary)] dark:bg-white text-[var(--color-bg-primary)] dark:text-black font-black py-4 md:py-5 rounded-2xl shadow-2xl hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center group mx-auto text-lg md:text-xl"
                  >
                    대시보드 입장하기
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};
