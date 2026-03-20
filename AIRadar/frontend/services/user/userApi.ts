import { api } from '../common/api';

export interface UserInfo {
  id: number;
  email: string;
  name: string;
  nickname: string;
  isNewsletterSubscribed: boolean;
}

export interface InterestItem {
  keyword: string;
  weight: number;
  source: string;
  createdAt: string;
}

export interface UpdateUserInput {
  nickname?: string;
  email?: string;
  password?: string;
  isNewsletterSubscribed?: boolean;
  interests?: string[];
}

export const userApi = {
  // 내 정보 조회 — GET /users/me
  getMe: (): Promise<UserInfo> => api.get('/users/me'),

  // 내 정보 수정 — PUT /users/me
  updateMe: (data: UpdateUserInput): Promise<UserInfo> => api.put('/users/me', data),

  // 관심 키워드 목록 조회 — GET /users/me/interests
  getInterests: (): Promise<InterestItem[]> => api.get('/users/me/interests'),

  // 관심 키워드 추가 — POST /users/me/interests
  addInterest: (keyword: string) => api.post('/users/me/interests', { keyword }),

  // 관심 키워드 삭제 — DELETE /users/me/interests/{keyword}
  removeInterest: (keyword: string) => api.delete(`/users/me/interests/${encodeURIComponent(keyword)}`),

  // 온보딩 완료 — POST /users/me/onboarding
  completeOnboarding: (keywords: string[]): Promise<void> => api.post('/users/me/onboarding', { keywords }),
};
