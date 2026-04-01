# 이벤트 발송 API 명세

> **대상 독자**: 프론트엔드 개발자
> **읽는 데 걸리는 시간**: 약 8분
> **전제 지식**: Axios/Fetch 기본 사용법, React hooks 기초

이 문서는 사용자 행동 이벤트를 백엔드로 전송하는 방법을 설명합니다.

---

## 왜 이벤트를 발송해야 하는가

이벤트가 없으면 추천 시스템은 사용자가 무엇에 관심 있는지 알 수 없습니다.

이벤트를 발송하지 않으면:
- 추천 결과가 `COLD_START` 상태로 고정됩니다 (모든 사용자에게 동일한 인기 기사만 표시)
- 검색 트렌딩 데이터가 쌓이지 않아 트렌딩 키워드 기능이 동작하지 않습니다
- Spark ALS 배치 추천 품질이 낮아집니다

**이벤트는 추천 품질의 핵심 원료입니다.**

---

## 핵심 원칙: Fire-and-Forget

모든 이벤트 API는 **응답을 기다리지 않고 발송만 하면** 됩니다.

- 백엔드는 이벤트를 비동기로 처리합니다. API 응답이 즉시 `202 Accepted`로 반환됩니다.
- 이벤트 발송 실패(네트워크 오류 등)는 **사용자 경험에 영향을 주지 않아야** 합니다. 항상 `.catch(() => {})` 처리를 하세요.
- 이벤트 발송이 API 응답을 블로킹해서는 안 됩니다.

```typescript
// ✅ 올바른 방식 — 응답 대기 없음, 실패 무시
api.post('/events/article-view', payload).catch(() => {});

// ❌ 잘못된 방식 — await로 UI를 블로킹
await api.post('/events/article-view', payload);
```

---

## 이벤트 1: 기사 조회

### 언제 발송하나

사용자가 기사 상세 페이지에서 **5초 이상 체류**하다가 떠날 때 발송합니다.

> **왜 5초인가**: 실수로 열거나 즉시 닫는 경우를 제외하기 위해 클라이언트에서 최소 5초를 필터링합니다. 백엔드는 추가로 30초 미만 체류를 프로파일에 반영하지 않습니다. 발송 자체는 5초 이상이면 하되, 실제 프로파일 반영 여부는 백엔드가 결정합니다.

### 엔드포인트

```
POST /api/v1/events/article-view
Authorization: Bearer {accessToken}  (선택 — 비로그인은 무시됨)
Content-Type: application/json
```

### 요청 Body

```json
{
  "articleId": "news_abc123",
  "dwellTimeSeconds": 45
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `articleId` | `string` | 필수 | 기사 고유 ID |
| `dwellTimeSeconds` | `number` | 필수 | 체류 시간 (초 단위, 0 이상) |

### 구현 예시

```typescript
// 기사 상세 페이지 컴포넌트
function ArticleDetailPage({ articleId }: { articleId: string }) {
  useEffect(() => {
    const startTime = Date.now();

    return () => {
      const dwellSec = Math.floor((Date.now() - startTime) / 1000);
      if (dwellSec >= 5) {
        api.post('/events/article-view', {
          articleId,
          dwellTimeSeconds: dwellSec,
        }).catch(() => {});
      }
    };
  }, [articleId]);

  // ...
}
```

---

## 이벤트 2: 검색

### 언제 발송하나

사용자가 검색을 실행할 때마다 발송합니다. 로그인 여부와 무관합니다.

- **비로그인**: 트렌딩 키워드에만 반영됩니다.
- **로그인**: 트렌딩 + 개인 프로파일 모두에 반영됩니다.

### 엔드포인트

```
POST /api/v1/events/search
Content-Type: application/json
```

> 이 엔드포인트는 **인증이 필요 없습니다**. Authorization 헤더를 포함해도 되고 안 해도 됩니다.

### 요청 Body

```json
{
  "query": "HBM 메모리"
}
```

| 필드 | 타입 | 필수 | 제약 |
|------|------|------|------|
| `query` | `string` | 필수 | 최대 500자, 빈 문자열 불가 |

### 구현 예시

```typescript
// 검색바 컴포넌트
const handleSearch = (query: string) => {
  if (!query.trim()) return;

  // 검색 이벤트 발송 (응답 대기 없음)
  api.post('/events/search', { query }).catch(() => {});

  // 실제 검색 실행
  router.push(`/search?q=${encodeURIComponent(query)}`);
};
```

---

## 이벤트 3: 좋아요

### 언제 발송하나

사용자가 좋아요 버튼을 누를 때 발송합니다. **로그인 필수**입니다.

### 엔드포인트

```
POST /api/v1/events/article-like
Authorization: Bearer {accessToken}
Content-Type: application/json
```

### 요청 Body

```json
{
  "articleId": "news_abc123"
}
```

### 구현 예시

```typescript
const handleLike = (articleId: string) => {
  // UI 즉시 업데이트 (낙관적 업데이트)
  setLiked(true);

  // 이벤트 발송
  api.post('/events/article-like', { articleId }).catch(() => {
    // 실패 시 UI 롤백
    setLiked(false);
  });
};
```

---

## 이벤트 4: 북마크

### 언제 발송하나

사용자가 북마크 버튼을 누를 때 발송합니다. **로그인 필수**입니다.

### 엔드포인트

```
POST /api/v1/events/article-bookmark
Authorization: Bearer {accessToken}
Content-Type: application/json
```

### 요청 Body

```json
{
  "articleId": "news_abc123"
}
```

---

## 이벤트 서비스 모듈 예시

반복 코드를 줄이기 위해 이벤트 함수를 모듈로 묶어 사용하세요.

```typescript
// services/common/eventService.ts

import api from './api';

/**
 * 기사 조회 이벤트 발송
 * @param articleId 기사 ID
 * @param dwellTimeSeconds 체류 시간 (초)
 */
export function trackArticleView(articleId: string, dwellTimeSeconds: number): void {
  api.post('/events/article-view', { articleId, dwellTimeSeconds })
    .catch(() => {});
}

/**
 * 검색 이벤트 발송 (비로그인 가능)
 * @param query 검색어
 */
export function trackSearch(query: string): void {
  if (!query.trim()) return;
  api.post('/events/search', { query }).catch(() => {});
}

/**
 * 좋아요 이벤트 발송 (로그인 필요)
 * @param articleId 기사 ID
 */
export function trackArticleLike(articleId: string): void {
  api.post('/events/article-like', { articleId }).catch(() => {});
}

/**
 * 북마크 이벤트 발송 (로그인 필요)
 * @param articleId 기사 ID
 */
export function trackArticleBookmark(articleId: string): void {
  api.post('/events/article-bookmark', { articleId }).catch(() => {});
}
```

---

## 이벤트 발송 체크리스트

구현 전 다음 항목을 확인하세요.

- [ ] 기사 상세 페이지: 컴포넌트 언마운트 시 체류 시간 계산 + 발송
- [ ] 검색바: 검색 실행 시 쿼리 발송
- [ ] 뉴스 카드: 좋아요 버튼 클릭 시 발송
- [ ] 뉴스 카드: 북마크 버튼 클릭 시 발송
- [ ] 모든 이벤트: `.catch(() => {})` 로 실패 무시 처리 확인
- [ ] 기사 조회 이벤트: `dwellTimeSeconds >= 5` 조건 확인

---

## 자주 묻는 질문

**Q. 같은 기사를 여러 번 읽으면 가중치가 계속 쌓이나요?**

A. 네. 반복 조회할수록 해당 기사의 키워드 가중치가 누적됩니다. 이는 의도된 동작으로, 관심 있는 주제를 반복적으로 읽는 행동이 강한 관심 신호로 처리됩니다.

**Q. 이벤트 발송 실패율이 높으면 추천 품질이 나빠지나요?**

A. 일부 실패는 추천에 큰 영향을 주지 않습니다. 다만 발송 자체를 하지 않는 것과 간헐적 실패는 차이가 있습니다. 네트워크 오류 시 재시도 로직을 추가하고 싶다면 최대 1회 재시도를 권장합니다.

**Q. 비로그인 사용자의 검색 이벤트도 의미가 있나요?**

A. 트렌딩 키워드(`/recommendations/trending`)에는 반영됩니다. 개인화 추천에는 반영되지 않습니다.

---

## 관련 문서

- [온보딩 플로우 명세](./02-onboarding-flow.md) — 최초 관심사 설정
- [개인화 피드 API 명세](./04-feed-api.md) — 이벤트가 쌓인 후 피드 조회
- [추천 시스템 아키텍처 개요](./01-architecture-overview.md) — 이벤트가 어떻게 추천에 반영되는지
