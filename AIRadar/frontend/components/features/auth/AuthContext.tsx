'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { authApi } from '../../../services/auth/authApi';

interface AuthContextType {
  isLoggedIn: boolean;
  loginState: (accessToken: string) => void;
  logoutState: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // 초기 로드 시 토큰 확인 및 세션 복구 시도
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      setIsLoggedIn(true);
    } else {
      // 토큰이 없더라도 쿠키에 Refresh Token이 있을 수 있으므로 재발급 시도
      authApi.refresh()
        .then((res: any) => {
          if (res.accessToken) {
            localStorage.setItem('accessToken', res.accessToken);
            setIsLoggedIn(true);
          }
        })
        .catch(() => {
          setIsLoggedIn(false);
          localStorage.removeItem('accessToken');
        });
    }
  }, []);

  const loginState = (accessToken: string) => {
    localStorage.setItem('accessToken', accessToken);
    setIsLoggedIn(true);
  };

  const logoutState = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('accessToken');
      setIsLoggedIn(false);
    }
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, loginState, logoutState }}>
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
