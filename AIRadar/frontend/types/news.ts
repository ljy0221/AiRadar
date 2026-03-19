// types/news.ts
// 뉴스(News) 관련 TypeScript 타입 정의
// 백엔드 NewsDto.ListItem / NewsDto.Detail 기반

export interface NewsListItem {
  articleId: string;
  title: string;
  source: string;
  region: 'GLOBAL' | 'DOMESTIC';
  category: NewsCategory;
  sentiment: Sentiment;
  score: number;
  publishedAt: string; // ISO 8601
  summary?: string;   // mock API 응답에 포함, 없을 수도 있음
  url?: string;       // mock API 응답에 포함, 없을 수도 있음
}

export interface NewsDetail extends NewsListItem {
  content: string;
  url: string;
  countryCode: string; // ISO 2자리 (예: 'US', 'KR')
  keywords: string[];
  summary: string;
  viewCount: number;
}

export type Sentiment = 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';

export type NewsCategory =
  | 'AI_MODEL'
  | 'AI_HARDWARE'
  | 'AI_POLICY'
  | 'AI_RESEARCH'
  | 'AI_BUSINESS';

export interface NewsListParams {
  region?: 'GLOBAL' | 'DOMESTIC';
  category?: NewsCategory;
  page?: number;
  size?: number;
}
