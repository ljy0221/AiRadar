'use client';

import { useState } from 'react';
import { Button } from '@/components/common/Button';
import { EditProfileModal } from './EditProfileModal';
import { NewsletterSubscribeModal } from '@/components/features/home';


import { useUserQuery, useUpdateUserMutation } from '@/hooks/queries/useUserQuery';

// ── AI 관심 키워드 목록 ───────────────────────────────────────────────────────
const AI_KEYWORDS = [
  // 모델/기술
  { id: 'llm',         label: 'LLM',           category: '모델/기술' },
  { id: 'gpt',         label: 'GPT',            category: '모델/기술' },
  { id: 'claude',      label: 'Claude',         category: '모델/기술' },
  { id: 'gemini',      label: 'Gemini',         category: '모델/기술' },
  { id: 'multimodal',  label: '멀티모달',        category: '모델/기술' },
  { id: 'rag',         label: 'RAG',            category: '모델/기술' },
  { id: 'finetune',    label: '파인튜닝',        category: '모델/기술' },
  { id: 'agent',       label: 'AI 에이전트',     category: '모델/기술' },
  // 개발/엔지니어링
  { id: 'mlops',       label: 'MLOps',          category: '개발/엔지니어링' },
  { id: 'inference',   label: '추론 최적화',     category: '개발/엔지니어링' },
  { id: 'vector_db',   label: '벡터DB',          category: '개발/엔지니어링' },
  { id: 'prompt',      label: '프롬프트 엔지니어링', category: '개발/엔지니어링' },
  { id: 'open_source', label: '오픈소스 AI',     category: '개발/엔지니어링' },
  // 산업/비즈니스
  { id: 'ai_policy',   label: 'AI 정책/규제',    category: '산업/비즈니스' },
  { id: 'startup',     label: 'AI 스타트업',     category: '산업/비즈니스' },
  { id: 'hardware',    label: 'AI 반도체',       category: '산업/비즈니스' },
  { id: 'robotics',    label: '로보틱스',        category: '산업/비즈니스' },
  { id: 'generative',  label: '생성형 AI',       category: '산업/비즈니스' },
  // 직군별
  { id: 'ai_fe',       label: 'AI × 프론트엔드', category: '직군별' },
  { id: 'ai_be',       label: 'AI × 백엔드',     category: '직군별' },
  { id: 'ai_data',     label: 'AI × 데이터',     category: '직군별' },
  { id: 'ai_design',   label: 'AI × 디자인',     category: '직군별' },
];

const CATEGORIES = ['모델/기술', '개발/엔지니어링', '산업/비즈니스', '직군별'] as const;

export const ProfileDetail = () => {
  const { data: user, isLoading, isError } = useUserQuery();
  const updateMutation = useUpdateUserMutation();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isNewsletterModalOpen, setIsNewsletterModalOpen] = useState(false);
  const [isKeywordEditing, setIsKeywordEditing] = useState(false);
  
  // API에서 주는 interests 정보가 없을 경우를 대비해 빈 배열을 기본값으로 사용합니다.
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>(user?.interests ?? []);

  // user 구조에 interests가 확실히 있다면 이 타이밍에 동기화해줍니다 (단, fetch 완료 후)
  // 여기서는 단순하게 API 연동으로 돌리는 것을 목표로 하므로, 
  // 실제 키워드 저장이 어떻게 넘어오느냐에 따라 수정이 필요할 수 있습니다.

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto py-12 px-4 flex justify-center items-center h-64">
        <p className="text-gray-500 animate-pulse">사용자 정보를 불러오는 중...</p>
      </div>
    );
  }

  if (isError || !user) {
    return (
      <div className="max-w-5xl mx-auto py-12 px-4 text-center">
        <p className="text-red-500">사용자 정보를 불러오는 데 실패했습니다.</p>
      </div>
    );
  }

  const handleToggleNewsletter = () => {
    if (!user.isNewsletterSubscribed) {
      setIsNewsletterModalOpen(true);
    } else {
      updateMutation.mutate({ isNewsletterSubscribed: false }, {
        onSuccess: () => alert('뉴스레터 구독이 해지되었습니다.'),
      });
    }
  };

  const handleSaveProfile = (newData: { nickname: string; password: string }) => {
    const payload: Record<string, unknown> = { nickname: newData.nickname };
    if (newData.password) payload.password = newData.password;
    updateMutation.mutate(payload as Parameters<typeof updateMutation.mutate>[0], {
      onSuccess: () => setIsEditModalOpen(false),
    });
  };

  const toggleKeyword = (id: string) => {
    setSelectedKeywords((prev) =>
      prev.includes(id) ? prev.filter((k) => k !== id) : [...prev, id]
    );
  };

  const handleSaveKeywords = () => {
    updateMutation.mutate({ interests: selectedKeywords }, {
      onSuccess: () => setIsKeywordEditing(false),
    });
  };

  const handleCancelKeywords = () => {
    setSelectedKeywords(user?.interests || []);
    setIsKeywordEditing(false);
  };

  return (
    <div className="max-w-5xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-8 text-[var(--color-text-primary)]">내 프로필</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">

          {/* 기본 정보 카드 */}
          <div className="bg-white dark:bg-gray-800/50 rounded-2xl p-8 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-1">{user.name}</h2>
                <p className="text-gray-500 text-sm">{user.email}</p>
              </div>
              <Button variant="outline" onClick={() => setIsEditModalOpen(true)}>
                회원 정보 수정
              </Button>
            </div>

            <div className="pt-8 border-t border-gray-100 dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-4 text-[var(--color-text-primary)]">서비스 설정</h3>
              <div className="flex items-center justify-between p-6 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                <div>
                  <p className="font-medium text-[var(--color-text-primary)]">뉴스레터 구독</p>
                </div>
                <Button
                  variant={user.isNewsletterSubscribed ? 'outline' : 'primary'}
                  onClick={handleToggleNewsletter}
                  disabled={updateMutation.isPending}
                  className={`min-w-[120px] ${user.isNewsletterSubscribed ? 'border-red-500 text-red-500 hover:bg-red-50' : ''}`}
                >
                  {updateMutation.isPending ? '처리 중...' : user.isNewsletterSubscribed ? '구독 해지' : '구독하기'}
                </Button>
              </div>
            </div>
          </div>

          {/* 관심 키워드 카드 */}
          <div className="bg-white dark:bg-gray-800/50 rounded-2xl p-8 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">관심 AI 키워드</h3>
                <p className="text-gray-400 text-xs mt-1">선택한 키워드 기반으로 맞춤 콘텐츠를 추천해 드립니다.</p>
              </div>
              {!isKeywordEditing ? (
                <Button variant="outline" onClick={() => setIsKeywordEditing(true)}>
                  수정
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleCancelKeywords}>취소</Button>
                  <Button onClick={handleSaveKeywords}>저장</Button>
                </div>
              )}
            </div>

            <div className="space-y-6">
              {CATEGORIES.map((cat) => (
                <div key={cat}>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">{cat}</p>
                  <div className="flex flex-wrap gap-2">
                    {AI_KEYWORDS.filter((kw) => kw.category === cat).map((kw) => {
                      const selected = selectedKeywords.includes(kw.id);
                      return (
                        <button
                          key={kw.id}
                          onClick={() => isKeywordEditing && toggleKeyword(kw.id)}
                          disabled={!isKeywordEditing}
                          className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition-all duration-200 ${
                            selected
                              ? 'bg-[var(--color-accent)] border-[var(--color-accent)] text-white shadow-sm'
                              : 'bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400'
                          } ${isKeywordEditing ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
                        >
                          {kw.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* 선택 개수 표시 */}
            <p className="mt-6 text-xs text-gray-400 text-right">
              {selectedKeywords.length}개 선택됨
            </p>
          </div>

        </div>

        {/* 사이드바 */}
        <div className="space-y-8">
          <div className="bg-white dark:bg-gray-800/50 rounded-2xl p-8 shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4">내 관심 키워드 요약</h3>
            {(user.interests || []).length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {(user.interests || []).map((id: string) => {
                  const kw = AI_KEYWORDS.find((k) => k.id === id);
                  return kw ? (
                    <span
                      key={id}
                      className="px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--color-accent)]/10 text-[var(--color-accent)] border border-[var(--color-accent)]/20"
                    >
                      {kw.label}
                    </span>
                  ) : null;
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-400">선택된 키워드가 없습니다.</p>
            )}
          </div>
        </div>
      </div>

      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        initialData={{ nickname: user.nickname, email: user.email }}
        onSave={handleSaveProfile}
        isLoading={updateMutation.isPending}
      />

      <NewsletterSubscribeModal 
        isOpen={isNewsletterModalOpen} 
        onClose={() => setIsNewsletterModalOpen(false)} 
      />
    </div>
  );
};
