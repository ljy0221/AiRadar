// services/newsletter/newsletterApi.ts

import { api } from '../common/api';
import type { NewsletterSubscribeRequest, NewsletterSubscribeResponse } from '@/types/newsletter';

/**
 * 뉴스레터 구독 신청
 */
export const subscribeNewsletter = async (data: NewsletterSubscribeRequest): Promise<NewsletterSubscribeResponse> => {
  return await api.post('/mail', data);
};
