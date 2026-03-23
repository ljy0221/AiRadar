'use client';

import { useState } from 'react';
import { Button } from '@/components/common/Button';
import { EditProfileModal } from './EditProfileModal';
import { ChangePasswordModal } from './ChangePasswordModal';
import { NewsletterSubscribeModal } from '@/components/features/home';
import { X } from 'lucide-react';
import { BookmarkList } from './BookmarkList';

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
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
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

  const handleSaveProfile = (newData: { nickname: string; email: string }) => {
    updateMutation.mutate({ nickname: newData.nickname, email: newData.email }, {
      onSuccess: () => setIsEditModalOpen(false),
    });
  };

  const handleUpdatePassword = (password: string) => {
    updateMutation.mutate({ password }, {
      onSuccess: () => {
        setIsPasswordModalOpen(false);
        alert('비밀번호가 성공적으로 변경되었습니다.');
      },
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
    <div className="max-w-[1440px] mx-auto py-12 px-2">
      <h1 className="text-3xl font-bold mb-8 text-[var(--color-text-primary)]">내 프로필</h1>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-8 items-start">
        <div className="space-y-8 min-w-0">

          {/* 기본 정보 카드 */}
          <div className="bg-white dark:bg-gray-800/50 rounded-2xl p-8 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-1">{user.name}</h2>
                <p className="text-gray-500 text-sm">{user.email}</p>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setIsPasswordModalOpen(true)}
                  className="border border-gray-100 text-gray-400 hover:text-[var(--color-accent)] hover:border-[var(--color-accent)] transition-all"
                >
                  비밀번호 변경
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setIsEditModalOpen(true)}
                  className="border border-gray-100 text-gray-400 hover:text-[var(--color-accent)] hover:border-[var(--color-accent)] transition-all"
                >
                  회원 정보 수정
                </Button>
              </div>
            </div>

            <div className="pt-8 border-t border-gray-100 dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-4 text-[var(--color-text-primary)]">서비스 설정</h3>
              <div className="flex items-center justify-between p-6 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                <div>
                  <p className="font-medium text-[var(--color-text-primary)]">뉴스레터 구독</p>
                </div>
                <Button
                  variant={user.isNewsletterSubscribed ? 'outline' : 'primary'}
                  size="sm"
                  onClick={handleToggleNewsletter}
                  disabled={updateMutation.isPending}
                  className={`min-w-[100px] ${user.isNewsletterSubscribed ? 'border-red-400 text-red-400 hover:bg-red-50' : 'bg-[#C2410C]/80 hover:bg-[#C2410C]'}`}
                >
                  {updateMutation.isPending ? '처리 중...' : user.isNewsletterSubscribed ? '구독취소하기' : '구독하기'}
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

            <div className="flex gap-2 mb-8">
              <input
                type="text"
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddKeyword(e as any);
                  }
                }}
                placeholder="관심 키워드를 입력하세요"
                className="flex-1 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2.5 text-xs outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)] transition-all"
                maxLength={100}
                disabled={addInterestMutation.isPending}
              />
              <Button
                type="button"
                size="md"
                onClick={handleAddKeyword as any}
                disabled={!newKeyword.trim() || addInterestMutation.isPending}
                className="bg-gray-700 text-white rounded-lg hover:bg-gray-800 active:scale-95 transition-all w-20"
              >
                {addInterestMutation.isPending ? '추가 중...' : '추가'}
              </Button>
            </div>

            <div className="flex flex-wrap gap-2 max-w-full overflow-hidden">
              {currentInterests.map((keyword: string) => (
                <div
                  key={keyword}
                  className="flex items-center gap-1 pl-4 pr-1 py-1.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-full group transition-colors hover:border-gray-300"
                >
                  <span className="text-xs font-medium text-[var(--color-text-primary)] max-w-[200px] truncate">
                    {keyword}
                  </span>
                  <button
                    onClick={() => handleRemoveKeyword(keyword)}
                    disabled={removeInterestMutation.isPending}
                    className="p-1 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <X className="w-3 h-3" />
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

          {/* 북마크 목록 섹션 추가 */}
          <BookmarkList />

        </div>

        {/* 사이드바 — Sticky 적용 */}
        <div className="space-y-8 sticky top-24 self-start">
          <div className="bg-white dark:bg-gray-800/50 rounded-2xl p-8 shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4">내 관심 키워드 요약</h3>
            {currentInterests.length > 0 ? (
              <div className="flex flex-wrap gap-2 max-w-full overflow-hidden">
                {currentInterests.map((keyword: string) => (
                  <span
                    key={keyword}
                    className="px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--color-accent)]/10 text-[var(--color-accent)] border border-[var(--color-accent)]/20 max-w-[200px] truncate"
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

      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        onSave={handleUpdatePassword}
        isLoading={updateMutation.isPending}
      />

      <NewsletterSubscribeModal
        isOpen={isNewsletterModalOpen}
        onClose={() => setIsNewsletterModalOpen(false)}
        onSuccess={() => {
          updateMutation.mutate({ isNewsletterSubscribed: true }, {
            onSuccess: () => {
              setIsNewsletterModalOpen(false);
            }
          });
        }}
      />
    </div>
  );
};
