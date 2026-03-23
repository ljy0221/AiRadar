import { api } from '../common/api';

export interface ViewEvent {
  articleId: string;
  dwellTimeSeconds?: number;
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
    api.post('/events/article-view', data).catch(() => { }),

  // 기사 원문 클릭 이벤트 (상세 페이지가 없는 경우 대응)
  trackArticleClick: (articleId: string) =>
    api.post('/events/article-view', { articleId }).catch(() => { }),

  // 검색 이벤트
  trackSearch: (query: string) =>
    api.post('/events/search', { query }).catch(() => { }),


  // 북마크 이벤트
  trackBookmark: (articleId: string) =>
    api.post('/events/article-bookmark', { articleId }).catch(() => { }),
};
