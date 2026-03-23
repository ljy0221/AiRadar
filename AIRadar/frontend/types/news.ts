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
  isBookmarked?: boolean; // 유저의 북마크 여부
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
  | 'LLM'
  | 'Vision'
  | 'Semiconductor'
  | 'ETC';

export interface NewsListParams {
  region?: 'GLOBAL' | 'DOMESTIC';
  category?: NewsCategory;
  date?: string; // yyyy-MM-dd
  page?: number;
  size?: number;
}

export interface DailyNewsGroup {
  date: string;
  items: NewsListItem[];
}
