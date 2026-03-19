import { api } from '../common/api';

export interface UserInfo {
  id: number;
  email: string;
  name: string;
  nickname: string;
  isNewsletterSubscribed: boolean;
  interests?: string[]; // AI 키워드 목록
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
};

