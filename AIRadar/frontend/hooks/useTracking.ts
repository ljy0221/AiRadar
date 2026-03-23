'use client';

import { useEffect, useCallback } from 'react';
import { eventApi } from '../services/events/eventApi';

export const useTracking = () => {
  // 기사 조회 트래킹 (상세 페이지에서 사용 - 현재는 상세 페이지가 없으나 구조 유지)
  const useArticleViewTracking = (articleId: string | undefined) => {
    useEffect(() => {
      if (!articleId) return;
      
      const startTime = Date.now();
      
      return () => {
        const dwellSec = Math.floor((Date.now() - startTime) / 1000);
        // 최소 5초 이상 체류 시에만 발송하여 유의미한 데이터 확보 및 네트워크 낭비 방지
        if (dwellSec >= 5) {
          eventApi.trackArticleView({
            articleId,
            dwellTimeSeconds: dwellSec
          });
        }
      };
    }, [articleId]);
  };

  // 검색 트래킹
  const trackSearch = useCallback((query: string) => {
    if (!query.trim()) return;
    eventApi.trackSearch(query);
  }, []);

  // 좋아요 트래킹
  const trackLike = useCallback((articleId: string) => {
    eventApi.trackLike(articleId);
  }, []);

  // 북마크 트래킹
  const trackBookmark = useCallback((articleId: string) => {
    eventApi.trackBookmark(articleId);
  }, []);

  // 기사 원문 클릭 트래킹 (외부 링크 이동 전 호출)
  // 사용자가 eventApi를 /events/article-view로 수정했으므로 이에 맞춰 호출
  const trackArticleClick = useCallback((articleId: string) => {
    eventApi.trackArticleClick(articleId);
  }, []);

  return {
    useArticleViewTracking,
    trackSearch,
    trackLike,
    trackBookmark,
    trackArticleClick
  };
};
