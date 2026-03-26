export interface NewsListItem {
  articleId: string;
  title: string;
  source: string;
  region: 'GLOBAL' | 'DOMESTIC';
  category: NewsCategory;
  sentiment: Sentiment;
  score: number;
  publishedAt: string;
  summary?: string;
  url?: string;
  isBookmarked?: boolean;
  keywords?: string[];
}

export interface NewsDetail extends NewsListItem {
  content: string;
  url: string;
  countryCode: string;
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
  date?: string;
  page?: number;
  size?: number;
}

export interface DailyNewsGroup {
  date: string;
  items: NewsListItem[];
}
