// types/paper.ts

export interface PaperListItem {
  paperId: string;
  title: string;
  source: string;
  authors: string[];
  researchArea: string;
  category: string;
  publishedAt: string;
  isBookmarked?: boolean;
}

export interface PaperDetail extends PaperListItem {
  abstractText: string;
  url: string;
  keywords: string[];
  summary: string;
}

// 기존 PaperItem 호환용 (추후 정리 가능)
export type PaperItem = PaperDetail;

export interface DailyPaperGroup {
  date: string;
  items: PaperItem[];
}

export interface PaperListParams {
  category?: string;
  researchArea?: string;
  date?: string; // yyyy-MM-dd
  startDate?: string;
  endDate?: string;
  cursorPublishedAt?: string;
  cursorId?: string;
  size?: number;
}

export interface FeedCursor {
  publishedAt: string;
  id: string;
}

export interface PagedPaperFeed {
  groups: DailyPaperGroup[];
  nextCursor: FeedCursor | null;
  hasNext: boolean;
}
