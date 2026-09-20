# 개인화 피드 API 명세

> **대상 독자**: 프론트엔드 개발자
> **읽는 데 걸리는 시간**: 약 6분
> **전제 지식**: REST API 기초, React Query 또는 SWR 기초

이 문서는 개인화 뉴스 피드를 화면에 표시하는 방법을 설명합니다.

---

## 개인화 피드 vs 일반 뉴스 목록

| | 개인화 피드 | 일반 뉴스 목록 |
|---|---|---|
| **엔드포인트** | `GET /api/v1/recommendations/news` | `GET /api/v1/news` |
| **인증** | 필수 | 불필요 |
| **정렬 기준** | 사용자 관심사 + ALS | 최신순 / 인기순 |
| **캐시** | 30분 (사용자별) | 별도 정책 |
| **`reason` 필드** | 있음 | 없음 |

개인화 피드는 로그인 사용자 전용 화면에서 사용하세요.

---

## 엔드포인트

```
GET /api/v1/recommendations/news
Authorization: Bearer {accessToken}
```

### Query Parameters

| 파라미터 | 타입 | 기본값 | 최대값 | 설명 |
|----------|------|--------|--------|------|
| `size` | `number` | `20` | `50` | 반환할 기사 수 |

예시:
```
GET /api/v1/recommendations/news?size=30
```

### 응답

```typescript
type RecommendationItem[] // 배열 반환
```

```typescript
interface RecommendationItem {
  articleId: string;         // 기사 고유 ID
  title: string;             // 기사 제목
  source: string;            // 출처 (예: "TechCrunch", "조선일보")
  region: 'DOMESTIC' | 'GLOBAL';  // 국내/해외
  category: string;          // 카테고리 (예: "AI", "반도체")
  sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';  // AI 감성 분석 결과
  score: number;             // AI 품질 점수 (0.0 ~ 1.0)
  keywords: string[];        // AI 추출 키워드 (예: ["HBM", "GPU", "삼성"])
  publishedAt: string;       // 발행 시각 (ISO 8601, 예: "2026-03-20T09:30:00")
  reason: 'ALS' | 'KEYWORD_MATCH' | 'COLD_START';  // 추천 이유
}
```

### 응답 예시

```json
[
  {
    "articleId": "news_abc123",
    "title": "삼성전자, HBM4 양산 본격화 — AI 가속기 시장 공략",
    "source": "전자신문",
    "region": "DOMESTIC",
    "category": "반도체",
    "sentiment": "POSITIVE",
    "score": 0.87,
    "keywords": ["HBM", "삼성전자", "AI 가속기", "반도체"],
    "publishedAt": "2026-03-20T09:30:00",
    "reason": "KEYWORD_MATCH"
  },
  {
    "articleId": "news_xyz789",
    "title": "OpenAI, GPT-5 출시 예고 — 멀티모달 성능 대폭 향상",
    "source": "The Verge",
    "region": "GLOBAL",
    "category": "AI",
    "sentiment": "POSITIVE",
    "score": 0.92,
    "keywords": ["GPT-5", "OpenAI", "멀티모달"],
    "publishedAt": "2026-03-20T06:15:00",
    "reason": "ALS"
  }
]
```

---

## reason 필드 활용

`reason` 필드로 추천 이유를 사용자에게 표시할 수 있습니다.

| reason | 의미 | 추천 UI 표현 |
|--------|------|-------------|
| `ALS` | 비슷한 관심사 독자 기반 | "비슷한 독자들이 읽은 기사" |
| `KEYWORD_MATCH` | 내 관심 키워드와 일치 | "관심 키워드 기반" |
| `COLD_START` | 신규 사용자 인기 기사 | "지금 인기 있는 기사" |

> **표시 여부는 선택 사항**입니다. `reason` 배지를 카드에 표시하면 사용자가 왜 이 기사가 추천되었는지 이해하는 데 도움이 됩니다.

---

## 에러 처리

| 상태 코드 | 의미 | 처리 방법 |
|-----------|------|-----------|
| `200 OK` | 성공 | 피드 표시 |
| `200 OK (빈 배열)` | 추천 결과 없음 | "관심사를 설정하면 맞춤 기사를 추천해 드립니다" 안내 |
| `401 Unauthorized` | 인증 만료 | 토큰 갱신 후 재시도, 실패 시 로그인 화면 |
| `500 Internal Server Error` | 서버 오류 | 일반 뉴스 목록(`/news`)으로 폴백 |

---

## 캐시 동작 이해

개인화 피드는 **사용자별로 30분간 캐시**됩니다.

이것이 사용자 경험에 미치는 영향:

- **기사를 북마크하면 캐시가 즉시 삭제되어** 다음 요청부터 새로 계산됩니다.
- **관심사(`/api/v1/users/me/interests`)를 추가/삭제해도 피드가 바뀌지 않습니다.** 추천은 관심사 테이블이 아니라 Redis 프로파일(조회·북마크 이력)을 기반으로 하기 때문입니다. 온보딩에서 선택한 키워드만 프로파일에 초기값으로 기록됩니다.
- **조회 등 프로파일이 바뀌는 이벤트는 즉시 반영되지 않습니다.** 캐시가 만료되는 최대 30분 후에 반영됩니다.
- **새로고침해도 결과가 바뀌지 않을 수 있습니다.** 같은 캐시를 반환하기 때문입니다.
- **로그아웃 후 다시 로그인해도 캐시는 유지됩니다.** 사용자 ID 기반 캐시이기 때문입니다.

> **즉시 반영이 필요한 경우**: 기사 조회 등으로 바뀐 프로파일을 피드에 바로 반영할 수는 없으므로, 최대 30분 후에 다시 확인하도록 안내하세요. 백엔드에서 캐시를 직접 무효화하는 API는 제공하지 않으며, 기사 북마크(뉴스·논문 캐시 모두 삭제)와 논문 조회 이벤트에서만 자동으로 삭제됩니다. 관심사(`user_interests`) 설정 변경은 피드에 영향을 주지 않습니다.

---

## 구현 예시

### React Query 사용

```typescript
// hooks/queries/useRecommendationFeed.ts
import { useQuery } from '@tanstack/react-query';
import api from '@/services/common/api';
import type { RecommendationItem } from '@/types/recommendation';

export function useRecommendationFeed(size = 20) {
  return useQuery({
    queryKey: ['recommendations', 'news', size],
    queryFn: async (): Promise<RecommendationItem[]> => {
      const response = await api.get(`/recommendations/news?size=${size}`);
      return response.data;
    },
    staleTime: 30 * 60 * 1000,  // 30분 (백엔드 캐시와 일치)
    retry: 1,
  });
}
```

```typescript
// 피드 컴포넌트에서 사용
function PersonalizedFeed() {
  const { data: feed, isLoading, error } = useRecommendationFeed(20);

  if (isLoading) return <FeedSkeleton />;

  if (error || !feed) return <GeneralNewsFeed />;  // 폴백

  if (feed.length === 0) {
    return (
      <EmptyState
        message="관심사를 설정하면 맞춤 기사를 추천해 드립니다"
        action={<Link href="/settings/interests">관심사 설정하기</Link>}
      />
    );
  }

  return (
    <div>
      {feed.map((item) => (
        <NewsCard key={item.articleId} item={item} showReason />
      ))}
    </div>
  );
}
```

---

## 트렌딩 키워드 API (공개)

개인화 피드와 별도로 전체 사용자의 검색 트렌드를 표시할 수 있습니다. **인증 불필요**합니다.

### 전체 트렌딩 (누적)

```
GET /api/v1/recommendations/trending?limit=20
```

응답: `string[]` — 키워드 목록 (점수 내림차순)

```json
["AI", "HBM", "반도체", "GPU", "자율주행", "LLM"]
```

### 최근 1시간 핫이슈

```
GET /api/v1/recommendations/trending/hourly?limit=10
```

응답: `string[]`

```json
["GPT-5", "엔비디아", "데이터센터"]
```

| 파라미터 | 전체 트렌딩 기본값 | 최대값 | 시간별 기본값 | 최대값 |
|----------|-------------------|--------|--------------|--------|
| `limit` | `20` | `50` | `10` | `20` |

---

## 관련 문서

- [온보딩 플로우 명세](./02-onboarding-flow.md) — 최초 관심사 설정
- [이벤트 발송 API 명세](./03-event-api.md) — 피드 품질을 높이는 이벤트 발송
- [추천 시스템 아키텍처 개요](./01-architecture-overview.md) — 피드가 만들어지는 원리
