const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8888';

export interface UserEventPayload {
  event_type: string;
  page?: string;
  user_id?: string;
  metadata?: Record<string, unknown>;
}

export async function trackUserEvent(payload: UserEventPayload): Promise<void> {
  try {
    await fetch(`${API_BASE}/api/events/user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    // 이벤트 발행 실패는 UX에 영향 주지 않음
  }
}

export async function submitFeedback(payload: UserEventPayload): Promise<void> {
  try {
    await fetch(`${API_BASE}/api/events/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    // 피드백 발행 실패는 UX에 영향 주지 않음
  }
}
