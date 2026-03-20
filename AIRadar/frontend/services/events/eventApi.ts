import { api } from '../common/api';

export interface ViewEvent {
  articleId: string;
  dwellTimeSeconds: number;
}

export interface SearchEvent {
  query: string;
}

export interface ArticleEvent {
  articleId: string;
}

export const eventApi = {
  // 기사 조회 이벤트 (fire-and-forget)
  trackArticleView: (data: ViewEvent) => 
    api.post('/events/article-view', data).catch(() => {}),

  // 검색 이벤트
  trackSearch: (query: string) => 
    api.post('/events/search', { query }).catch(() => {}),

  // 좋아요 이벤트
  trackLike: (articleId: string) => 
    api.post('/events/article-like', { articleId }).catch(() => {}),

  // 북마크 이벤트
  trackBookmark: (articleId: string) => 
    api.post('/events/article-bookmark', { articleId }).catch(() => {}),
};
