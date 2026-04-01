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
          setOnboardingCompleted(false);
        }
      }
      setIsInitialized(true);
    } else {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        authApi.refresh(refreshToken)
          .then((res: any) => {
            if (res.accessToken) {
              localStorage.setItem('accessToken', res.accessToken);
              if (res.refreshToken) {
                localStorage.setItem('refreshToken', res.refreshToken);
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
    localStorage.setItem('userEmail', email);
    setUserEmail(email);
    localStorage.setItem(`onboarding_completed_${email}`, String(completed));
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
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('onboardingCompleted');
      setIsLoggedIn(false);
      setUserEmail(null);
      setOnboardingCompleted(true);
      queryClient.setQueryData(userQueryKeys.me, null);
      queryClient.clear();
    }
  };

  const updateOnboardingState = (completed: boolean) => {
    setOnboardingCompleted(completed);
    if (userEmail) {
      localStorage.setItem(`onboarding_completed_${userEmail}`, String(completed));
    } else {
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
