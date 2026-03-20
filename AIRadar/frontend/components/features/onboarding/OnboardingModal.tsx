'use client';

import { useState } from 'react';
import { Dialog, DialogPanel, Transition, TransitionChild } from '@headlessui/react';
import { Check, X, Sparkles, Rocket, Target, Cpu, Brain, Layers } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { userQueryKeys } from '../../../hooks/queries/useUserQuery';
import { userApi } from '../../../services/user/userApi';

const ONBOARDING_KEYWORDS = [
  {
    category: '개념/이론',
    icon: Brain,
    keywords: ['에이전틱 워크플로우', 'RAG', '멀티모달 AI', '파인튜닝', '프롬프트 엔지니어링']
  },
  {
    category: '모델',
    icon: Layers,
    keywords: ['GPT-4o', 'Claude 3.5 Sonnet', 'Llama 3', 'Gemini']
  },
  {
    category: '하드웨어',
    icon: Cpu,
    keywords: ['GPU', 'HBM', 'NPU', '반도체']
  },
  {
    category: '산업',
    icon: Target,
    keywords: ['자율주행', '로보틱스', 'AI 에이전트']
  }
];

export const OnboardingModal = () => {
  const { isLoggedIn, onboardingCompleted, setOnboardingCompleted } = useAuth();
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  // 온보딩이 필요 없는 상태거나 로그아웃 상태면 렌더링하지 않음
  if (!isLoggedIn || onboardingCompleted) return null;

  const toggleKeyword = (keyword: string) => {
    setSelectedKeywords(prev => 
      prev.includes(keyword) 
        ? prev.filter(k => k !== keyword) 
        : prev.length < 10 ? [...prev, keyword] : prev
    );
  };

  const handleSubmit = async () => {
    if (selectedKeywords.length === 0) return;
    
    setIsSubmitting(true);
    try {
      await userApi.completeOnboarding(selectedKeywords);
      // 관심사 데이터 캐시 무효화하여 최신화 유도
      queryClient.invalidateQueries({ queryKey: userQueryKeys.interests });
      setOnboardingCompleted(true);
    } catch (error) {
      console.error('Onboarding failed:', error);
      // 에러 발생 시에도 일단 진행하거나, 경고창 표시
      setOnboardingCompleted(true); 
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Transition show={true} as="div">
      <Dialog onClose={() => {}} className="relative z-[60]">
        <TransitionChild
          as="div"
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity" />
        </TransitionChild>

        <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <TransitionChild
              as="div"
              enter="ease-out duration-500"
              enterFrom="opacity-0 scale-95 translate-y-8"
              enterTo="opacity-100 scale-100 translate-y-0"
            >
              <DialogPanel className="w-full max-w-2xl transform overflow-hidden rounded-[40px] bg-white dark:bg-[#151726] p-10 shadow-2xl transition-all border border-gray-100 dark:border-gray-800">
                
                <div className="text-center mb-10">
                  <div className="w-16 h-16 bg-[var(--color-accent)]/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Sparkles className="w-8 h-8 text-[var(--color-accent)]" />
                  </div>
                  <h2 className="text-3xl font-black text-gray-900 dark:text-gray-100 tracking-tight mb-3">
                    환영합니다! 관심사를 알려주세요
                  </h2>
                  <p className="text-gray-500 dark:text-gray-400 font-medium max-w-md mx-auto">
                    선택하신 키워드를 바탕으로 가장 연관성 높은 AI 뉴스와 트렌드를 추천해 드립니다. (최대 10개)
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                  {ONBOARDING_KEYWORDS.map((group) => {
                    const Icon = group.icon;
                    return (
                      <div key={group.category} className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-500">
                            <Icon size={16} />
                          </div>
                          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">{group.category}</h3>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {group.keywords.map((keyword) => {
                            const isSelected = selectedKeywords.includes(keyword);
                            return (
                              <button
                                key={keyword}
                                onClick={() => toggleKeyword(keyword)}
                                className={`px-4 py-2.5 rounded-xl text-[13.5px] font-bold transition-all border ${
                                  isSelected
                                    ? 'bg-[var(--color-accent)] border-[var(--color-accent)] text-white shadow-lg shadow-[var(--color-accent)]/20 scale-105'
                                    : 'bg-white dark:bg-gray-800/40 border-gray-100 dark:border-gray-800 text-gray-600 dark:text-gray-300 hover:border-[var(--color-accent)]/30 hover:bg-gray-50 dark:hover:bg-gray-800'
                                }`}
                              >
                                {keyword}
                                {isSelected && <Check className="inline-block ml-1.5 w-3.5 h-3.5" strokeWidth={3} />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex flex-col items-center gap-4">
                  <button
                    onClick={handleSubmit}
                    disabled={selectedKeywords.length === 0 || isSubmitting}
                    className="w-full max-w-sm bg-[var(--color-accent)] text-white font-black py-4 rounded-2xl shadow-xl shadow-[var(--color-accent)]/30 hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed group"
                  >
                    {isSubmitting ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Rocket className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                        AI Radar 시작하기
                      </>
                    )}
                  </button>
                  <p className="text-[12px] font-bold text-gray-300 dark:text-gray-600">
                    {selectedKeywords.length} / 10 키워드 선택됨
                  </p>
                </div>

              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};
