import { api } from '../common/api';

export interface UserInfo {
  id: number;
  email: string;
  name: string;
  nickname: string;
  isNewsletterSubscribed: boolean;
}

export const userApi = {
  // 내 정보 조회
  getMe: (): Promise<UserInfo> => api.get('/users/me'),

  // 내 정보 수정
  updateMe: (data: Partial<UserInfo>): Promise<UserInfo> => api.patch('/users/me', data),
};
