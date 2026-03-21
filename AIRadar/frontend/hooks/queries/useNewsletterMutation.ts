// hooks/queries/useNewsletterMutation.ts

import { useMutation } from '@tanstack/react-query';
import { subscribeNewsletter } from '@/services/newsletter/newsletterApi';
import type { NewsletterSubscribeRequest } from '@/types/newsletter';

/**
 * 뉴스레터 구독 신청 Mutation 훅
 */
export const useSubscribeNewsletterMutation = () => {
  return useMutation({
    mutationFn: (data: NewsletterSubscribeRequest) => subscribeNewsletter(data),
    onSuccess: (data) => {
      console.log('Newsletter subscription successful:', data);
    },
    onError: (error) => {
      console.error('Newsletter subscription error:', error);
    },
  });
};
