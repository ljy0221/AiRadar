'use client';

import { useState } from 'react';
import { Button } from '@/components/common/Button';
import { EditProfileModal } from './EditProfileModal';

import { useUserQuery, useUpdateUserMutation } from '@/hooks/queries/useUserQuery';

export const ProfileDetail = () => {
  const { data: user, isLoading, isError } = useUserQuery();
  const updateMutation = useUpdateUserMutation();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

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
    updateMutation.mutate({
      isNewsletterSubscribed: !user.isNewsletterSubscribed,
    });
  };

  const handleSaveProfile = (newData: { nickname: string; email: string }) => {
    updateMutation.mutate(newData, {
      onSuccess: () => {
        setIsEditModalOpen(false);
      },
    });
  };

  return (
    <div className="max-w-5xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-8 text-[var(--color-text-primary)]">내 프로필</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
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

          {/* 추후 다른 컴포넌트 추가 영역 */}
          <div className="bg-white dark:bg-gray-800/50 rounded-2xl p-8 shadow-sm border border-gray-100 dark:border-gray-700 h-64 flex items-center justify-center text-gray-400 border-dashed">
            추가 예정 영역
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-white dark:bg-gray-800/50 rounded-2xl p-8 shadow-sm border border-gray-100 dark:border-gray-700 h-64 flex items-center justify-center text-gray-400 border-dashed">
            추가 예정 영역
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
    </div>
  );
};
