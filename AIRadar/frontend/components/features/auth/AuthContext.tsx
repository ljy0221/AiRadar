'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { authApi } from '../../../services/auth/authApi';
import { userQueryKeys } from '../../../hooks/queries/useUserQuery';

interface AuthContextType {
  isLoggedIn: boolean;
  isInitialized: boolean;
  onboardingCompleted: boolean;
  userEmail: string | null;
  loginState: (accessToken: string, refreshToken: string, onboardingCompleted: boolean, email: string) => void;
  logoutState: () => void;
  setOnboardingCompleted: (completed: boolean) => void;
  updateOnboardingState: (completed: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [onboardingCompleted, setOnboardingCompleted] = useState(true);
  const queryClient = useQueryClient();

  // 초기 로드 시 토큰 확인 및 세션 복구 시도
  useEffect(() => {
    const handleLogoutEvent = () => {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('onboardingCompleted');
      setIsLoggedIn(false);
      setOnboardingCompleted(true);
      queryClient.setQueryData(userQueryKeys.me, null);
      queryClient.clear();
    };

    window.addEventListener('auth-logout', handleLogoutEvent);

    const token = localStorage.getItem('accessToken');
    const savedEmail = localStorage.getItem('userEmail');
    
    if (token) {
      setIsLoggedIn(true);
      if (savedEmail) {
        setUserEmail(savedEmail);
        const stored = localStorage.getItem(`onboarding_completed_${savedEmail}`);
        if (stored !== null) {
          setOnboardingCompleted(stored === 'true');
        } else {
          // 이메일은 있는데 온보딩 기록이 없으면 미완료(false)로 간주하여 안전하게 모달 노출
          setOnboardingCompleted(false);
        }
      }
      setIsInitialized(true);
    } else {
      // 액세스 토큰이 없더라도 리프레시 토큰이 있으면 세션 복구 시도
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        authApi.refresh(refreshToken)
          .then((res: any) => {
            if (res.accessToken) {
              localStorage.setItem('accessToken', res.accessToken);
              if (res.refreshToken) {
                localStorage.setItem('refreshToken', res.refreshToken); // 토큰 로테이션 대응
              }
              setIsLoggedIn(true);
              if (res.onboardingCompleted !== undefined) {
                setOnboardingCompleted(res.onboardingCompleted);
                localStorage.setItem('onboardingCompleted', String(res.onboardingCompleted));
              }
            }
          })
          .catch(() => {
            setIsLoggedIn(false);
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
          })
          .finally(() => {
            setIsInitialized(true);
          });
      } else {
        setIsInitialized(true);
      }
    }

    return () => window.removeEventListener('auth-logout', handleLogoutEvent);
  }, [queryClient]);

  const loginState = (accessToken: string, refreshToken: string, completed: boolean, email: string) => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('userEmail', email); // 이메일 저장 추가
    setUserEmail(email);
    // 사용자 식별자를 포함한 전용 키로 저장
    localStorage.setItem(`onboarding_completed_${email}`, String(completed));
    // 구버전 및 임시 키 데이터 삭제
    localStorage.removeItem('onboardingCompleted');
    
    setIsLoggedIn(true);
    setOnboardingCompleted(completed);
    queryClient.invalidateQueries({ queryKey: userQueryKeys.me });
  };

  const logoutState = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // 사용자별 온보딩 기록은 유지 (나중에 다시 로그인했을 때 스킵하기 위함)
      // localStorage.removeItem(`onboarding_completed_${userEmail}`); <- 제거하지 않음
      
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('userEmail'); // 이메일 삭제 추가
      localStorage.removeItem('onboardingCompleted');
      setIsLoggedIn(false);
      setUserEmail(null);
      setOnboardingCompleted(true);
      queryClient.setQueryData(userQueryKeys.me, null);
      queryClient.clear(); // 전체 캐시 비우기
    }
  };

  const updateOnboardingState = (completed: boolean) => {
    setOnboardingCompleted(completed);
    if (userEmail) {
      localStorage.setItem(`onboarding_completed_${userEmail}`, String(completed));
    } else {
      // 이메일을 모르는 경우(초기 진입 등) 글로벌 키에 백업
      localStorage.setItem('onboardingCompleted', String(completed));
    }
  };

  return (
    <AuthContext.Provider value={{ 
      isLoggedIn, 
      isInitialized, 
      onboardingCompleted, 
      userEmail,
      loginState, 
      logoutState,
      setOnboardingCompleted: updateOnboardingState,
      updateOnboardingState
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
