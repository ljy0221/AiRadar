// types/user.ts

export interface BookmarkItem {
  id: string;
  type: 'news' | 'paper';
  title: string;
  source: string;
  category: string;
  occurredAt: string; // ISO 8601
  url?: string;
}

export interface BookmarkHistoryResponse {
  articleId: string;
  occurredAt: string;
}
