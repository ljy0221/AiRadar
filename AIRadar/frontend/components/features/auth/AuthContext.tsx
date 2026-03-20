'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { authApi } from '../../../services/auth/authApi';
import { userQueryKeys } from '../../../hooks/queries/useUserQuery';

interface AuthContextType {
  isLoggedIn: boolean;
  isInitialized: boolean;
  onboardingCompleted: boolean;
  loginState: (accessToken: string, onboardingCompleted: boolean) => void;
  logoutState: () => void;
  setOnboardingCompleted: (completed: boolean) => void;
  updateOnboardingState: (completed: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('onboardingCompleted');
      return stored ? stored === 'true' : true; 
    }
    return true;
  });
  const queryClient = useQueryClient();

  // 초기 로드 시 토큰 확인 및 세션 복구 시도
  useEffect(() => {
    const handleLogoutEvent = () => {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('onboardingCompleted');
      setIsLoggedIn(false);
      setOnboardingCompleted(true);
      queryClient.setQueryData(userQueryKeys.me, null);
      queryClient.clear();
    };

    window.addEventListener('auth-logout', handleLogoutEvent);

    const token = localStorage.getItem('accessToken');
    if (token) {
      setIsLoggedIn(true);
      // 초기 진입 시에는 이미 온보딩을 했다고 가정하거나, 유저 정보를 다시 가져와서 확인해야 함
      // 여기서는 일단 true로 두고, 유저 정보 쿼리 결과에 따라 업데이트되게 유도
      setIsInitialized(true);
    } else {
      // 토큰이 없더라도 쿠키에 Refresh Token이 있을 수 있으므로 재발급 시도
      authApi.refresh()
        .then((res: any) => {
          if (res.accessToken) {
            localStorage.setItem('accessToken', res.accessToken);
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
        })
        .finally(() => {
          setIsInitialized(true);
        });
    }

    return () => window.removeEventListener('auth-logout', handleLogoutEvent);
  }, [queryClient]);

  const loginState = (accessToken: string, completed: boolean) => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('onboardingCompleted', String(completed));
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
      localStorage.removeItem('accessToken');
      localStorage.removeItem('onboardingCompleted');
      setIsLoggedIn(false);
      setOnboardingCompleted(true);
      queryClient.setQueryData(userQueryKeys.me, null);
      queryClient.clear(); // 전체 캐시 비우기 (보안상 권장)
    }
  };

  const updateOnboardingState = (completed: boolean) => {
    setOnboardingCompleted(completed);
    localStorage.setItem('onboardingCompleted', String(completed));
  };

  return (
    <AuthContext.Provider value={{ 
      isLoggedIn, 
      isInitialized, 
      onboardingCompleted, 
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
