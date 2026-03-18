'use client';

import { useEffect, useCallback } from 'react';
import { trackUserEvent, submitFeedback, type UserEventPayload } from '@/services/common/eventService';

/**
 * 페이지뷰 및 사용자 이벤트 자동 트래킹 훅
 *
 * 사용 예:
 *   const { track, feedback } = useEventTracking('/news');
 *   track('click', { item_id: '123' });
 *   feedback('like', { item_id: '123' });
 */
export function useEventTracking(page: string) {
  // 페이지 진입 시 자동 page_view 이벤트 발행
  useEffect(() => {
    trackUserEvent({ event_type: 'page_view', page });
  }, [page]);

  const track = useCallback(
    (eventType: string, metadata?: Record<string, unknown>) => {
      trackUserEvent({ event_type: eventType, page, metadata });
    },
    [page],
  );

  const feedback = useCallback(
    (eventType: string, metadata?: Record<string, unknown>) => {
      submitFeedback({ event_type: eventType, page, metadata });
    },
    [page],
  );

  return { track, feedback };
}
