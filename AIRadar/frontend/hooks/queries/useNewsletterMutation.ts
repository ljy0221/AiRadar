// hooks/queries/useNewsletterMutation.ts

import { useMutation } from '@tanstack/react-query';
import { subscribeNewsletter } from '@/services/newsletter/newsletterApi';
import type { NewsletterSubscribeRequest } from '@/types/newsletter';

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
