import { api } from '../common/api';

export const authApi = {
  // 일반 회원가입
  register: (data: any) => api.post('/auth/register', data),

  // 일반 로그인
  login: (data: any) => api.post('/auth/login', data),

  // 토큰 재발급 (액세스 토큰 만료 시 쿠키의 리프레시 토큰으로 재발급)
  refresh: () => api.post('/auth/refresh'),

  // 로그아웃 (리프레시 토큰 무효화)
  logout: () => api.post('/auth/logout'),
};
