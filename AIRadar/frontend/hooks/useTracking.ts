'use client';

import { useEffect, useCallback } from 'react';
import { eventService } from '../services/common/eventService';

export const useTracking = () => {
  // 기사 조회 트래킹 (상세 페이지/모달에서 사용)
  const useArticleViewTracking = (articleId: string | undefined) => {
    useEffect(() => {
      if (!articleId) return;
      
      const startTime = Date.now();
      
      return () => {
        const dwellSec = Math.floor((Date.now() - startTime) / 1000);
        // eventService 원칙(5초 이상)에 따라 발송
        eventService.trackArticleView(articleId, dwellSec);
      };
    }, [articleId]);
  };

  // 검색 트래킹
  const trackSearch = useCallback((query: string) => {
    eventService.trackSearch(query);
  }, []);

  // 북마크 트래킹
  const trackBookmark = useCallback((articleId: string) => {
    eventService.trackArticleBookmark(articleId);
  }, []);

  // 좋아요 트래킹
  const trackLike = useCallback((articleId: string) => {
    eventService.trackArticleLike(articleId);
  }, []);

  // 기사 원문 클릭 트래킹 (외부 링크 이동)
  const trackArticleClick = useCallback((articleId: string) => {
    // 클릭은 즉각적인 관심의 표현이므로 체류시간 0(또는 최소값)으로 즉시 발송
    eventService.trackArticleView(articleId, 0);
  }, []);

  return {
    useArticleViewTracking,
    trackSearch,
    trackBookmark,
    trackLike,
    trackArticleClick
  };
};
