// types/newsletter.ts

export interface NewsletterSubscribeRequest {
  email: string;
  jobCategory?: string;
}

export interface NewsletterSubscribeResponse {
  email: string;
  jobCategory: string;
  status: 'SUBSCRIBED';
}
