'use client';

import { useState } from 'react';
import { Button } from '@/components/common/Button';
import { EditProfileModal } from './EditProfileModal';
import { NewsletterSubscribeModal } from '@/components/features/home';
import { X } from 'lucide-react';

import {
  useUserQuery,
  useInterestsQuery,
  useUpdateUserMutation,
  useAddInterestMutation,
  useRemoveInterestMutation
} from '@/hooks/queries/useUserQuery';

export const ProfileDetail = () => {
  const { data: user, isLoading: isUserLoading, isError } = useUserQuery();
  const { data: interestItems, isLoading: isInterestsLoading } = useInterestsQuery();

  const updateMutation = useUpdateUserMutation();
  const addInterestMutation = useAddInterestMutation();
  const removeInterestMutation = useRemoveInterestMutation();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isNewsletterModalOpen, setIsNewsletterModalOpen] = useState(false);

  const [newKeyword, setNewKeyword] = useState('');

  const isLoading = isUserLoading || isInterestsLoading;

  // 서버에서 받은 InterestItem 배열에서 keyword 문자열만 추출
  const currentInterests = interestItems?.map((item) => item.keyword) || [];

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

  const handleAddKeyword = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newKeyword.trim();
    if (!trimmed) return;

    // 이중 등록 방지
    if (currentInterests.includes(trimmed)) {
      setNewKeyword('');
      return;
    }

    addInterestMutation.mutate(trimmed, {
      onSuccess: () => setNewKeyword('')
    });
  };

  const handleRemoveKeyword = (keyword: string) => {
    removeInterestMutation.mutate(keyword);
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

          {/* 관심 키워드 폼 (개편됨) */}
          <div className="bg-white dark:bg-gray-800/50 rounded-2xl p-8 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">관심 AI 키워드</h3>
              <p className="text-gray-400 text-xs mt-1">등록하신 키워드를 기반으로 맞춤 콘텐츠를 추천해 드립니다.</p>
            </div>

            <form onSubmit={handleAddKeyword} className="flex gap-2 mb-8">
              <input
                type="text"
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                placeholder="관심 키워드를 입력하세요"
                className="flex-1 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)] transition-all"
                maxLength={100}
                disabled={addInterestMutation.isPending}
              />
              <Button
                type="submit"
                disabled={!newKeyword.trim() || addInterestMutation.isPending}
                className="px-6"
              >
                {addInterestMutation.isPending ? '추가 중...' : '추가'}
              </Button>
            </form>

            <div className="flex flex-wrap gap-2">
              {currentInterests.map((keyword: string) => (
                <div
                  key={keyword}
                  className="flex items-center gap-1.5 pl-4 pr-1.5 py-1.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-full group transition-colors hover:border-gray-300 dark:hover:border-gray-600"
                >
                  <span className="text-sm font-medium text-[var(--color-text-primary)]">
                    {keyword}
                  </span>
                  <button
                    onClick={() => handleRemoveKeyword(keyword)}
                    disabled={removeInterestMutation.isPending}
                    className="p-1 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              {currentInterests.length === 0 && (
                <p className="text-sm text-gray-400 text-center w-full py-4">등록된 관심 키워드가 없습니다.</p>
              )}
            </div>

            <p className="mt-6 text-xs text-gray-400 text-right">
              {currentInterests.length}개 등록됨
            </p>
          </div>

        </div>

        {/* 사이드바 */}
        <div className="space-y-8">
          <div className="bg-white dark:bg-gray-800/50 rounded-2xl p-8 shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4">내 관심 키워드 요약</h3>
            {currentInterests.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {currentInterests.map((keyword: string) => (
                  <span
                    key={keyword}
                    className="px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--color-accent)]/10 text-[var(--color-accent)] border border-[var(--color-accent)]/20"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">등록된 키워드가 없습니다.</p>
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
