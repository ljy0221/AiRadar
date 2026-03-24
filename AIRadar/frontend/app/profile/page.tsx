'use client';

import { useAuth } from '@/components/features/auth/AuthContext';
import { ProfileDetail } from '@/components/features/profile/ProfileDetail';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ProfilePage() {
  const { isLoggedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token && !isLoggedIn) {
      router.push('/');
    }
  }, [isLoggedIn, router]);

  if (!isLoggedIn) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-gray-500">로그인 확인 중...</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--color-bg-primary)]">
      <ProfileDetail />
    </main>
  );
}
