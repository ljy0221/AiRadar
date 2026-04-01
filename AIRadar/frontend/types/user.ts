export interface BookmarkItem {
  id: string;
  type: 'news' | 'paper';
  title: string;
  source: string;
  category: string;
  occurredAt: string;
  url?: string;
}

export interface BookmarkHistoryResponse {
  articleId: string;
  occurredAt: string;
}
