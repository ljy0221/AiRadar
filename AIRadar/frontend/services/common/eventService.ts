import { api } from './api';

/**
 * 사용자 행동 이벤트 트래킹 서비스
 * 
 * [원칙] Fire-and-Forget
 * - 모든 이벤트는 응답을 기다리지 않고 발송만 합니다.
 * - 실패하더라도 사용자 경험(UI)에는 영향을 주지 않아야 합니다.
 */

export interface UserEventPayload {
  event_type: string;
  page: string;
  metadata?: Record<string, unknown>;
}

/**
 * 범용 이벤트 트래킹 함수 (useEventTracking 훅에서 사용)
 */
export const trackUserEvent = (payload: UserEventPayload): void => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  if (!token) return;

  api.post('/events/user-action', payload)
    .catch(() => { /* 무시 */ });
};

/**
 * 피드백(좋아요/싫어요 등) 제출 함수
 */
export const submitFeedback = (payload: UserEventPayload): void => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  if (!token) return;

  api.post('/events/feedback', payload)
    .catch(() => { /* 무시 */ });
};

export const eventService = {
  /**
   * 뉴스/논문 상세 조회 이벤트 (체류 시간 기반)
   * @param articleId 기사 또는 논문 고유 ID
   * @param dwellTimeSeconds 체류 시간 (초 단위)
   */
  trackArticleView: (articleId: string, dwellTimeSeconds: number): void => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token || dwellTimeSeconds < 5) return; 
    
    api.post('/events/article-view', { articleId, dwellTimeSeconds })
      .catch(() => { /* 이벤트 발송 실패는 무시 */ });
  },

  /**
   * 검색 이벤트 (트렌딩 키워드 수집용)
   * @param query 검색어
   */
  trackSearch: (query: string): void => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token || !query.trim()) return;
    
    api.post('/events/search', { query })
      .catch(() => { /* 무시 */ });
  },

  /**
   * 좋아요 이벤트
   * @param articleId 대상 ID
   */
  trackArticleLike: (articleId: string): void => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) return;
    
    api.post('/events/article-like', { articleId })
      .catch(() => { /* 무시 */ });
  },

  /**
   * 북마크 이벤트
   * @param articleId 대상 ID
   */
  trackArticleBookmark: (articleId: string): void => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) return;
    
    api.post('/events/article-bookmark', { articleId })
      .catch(() => { /* 무시 */ });
  },
};
