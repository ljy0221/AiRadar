# 추천 시스템 프론트엔드 연동 가이드

> 백엔드 담당자: AI-Radar Backend Team
> 최종 수정: 2026-03-20

---

## 1. 온보딩 플로우

### 개요

신규 가입 / 로그인 시 `onboardingCompleted` 값으로 온보딩 화면 표시 여부를 결정합니다.

```
로그인 / 회원가입
       ↓
TokenResponse 수신
       ↓
onboardingCompleted === false ?
  → 관심 키워드 선택 화면 표시
  → POST /api/v1/users/me/onboarding
  → 완료 후 메인 화면
onboardingCompleted === true ?
  → 바로 메인 화면
```

### 로그인 / 회원가입 응답 (TokenResponse)

```typescript
interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;        // "Bearer"
  onboardingCompleted: boolean;  // ← 신규 필드
}
```

**엔드포인트**:
- `POST /api/v1/auth/register` — 회원가입
- `POST /api/v1/auth/login` — 로그인
- `POST /api/v1/auth/refresh` — 토큰 갱신

### 온보딩 완료 API

```
POST /api/v1/users/me/onboarding
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "keywords": ["AI", "LLM", "GPU", "반도체"]
}
```

- `keywords`: 1~10개, 각 항목 빈 문자열 불가
- 성공: `200 OK` (body 없음)
- 이미 완료된 계정: `409 Conflict`

**TypeScript 예시**:

```typescript
// services/user/userApi.ts 에 추가
async function completeOnboarding(keywords: string[]): Promise<void> {
  await api.post('/users/me/onboarding', { keywords });
}
```

**추천 키워드 목록** (프론트엔드 정적 파일로 관리):

현재 `KeywordDictionary.tsx`에 있는 카테고리를 활용하세요.
- 개념/이론: `에이전틱 워크플로우`, `RAG`, `멀티모달 AI`, `파인튜닝`, `프롬프트 엔지니어링`
- 모델: `GPT-4o`, `Claude 3.5 Sonnet`, `Llama 3`, `Gemini`
- 하드웨어: `GPU`, `HBM`, `NPU`, `반도체`
- 산업: `자율주행`, `로보틱스`, `AI 에이전트`

---

## 2. 이벤트 발송 API

사용자 행동을 백엔드로 전송하면 Redis 프로파일에 반영되어 추천 품질이 높아집니다.
모든 이벤트는 **비동기(fire-and-forget)** 처리되어 API 응답을 블로킹하지 않습니다.

### 2-1. 기사 조회 이벤트

30초 이상 체류 시에만 프로파일에 반영됩니다. (백엔드에서 필터링)

```
POST /api/v1/events/article-view
Authorization: Bearer {accessToken}  (선택 — 비로그인도 수신은 하지만 무시됨)
Content-Type: application/json

{
  "articleId": "news_abc123",
  "dwellTimeSeconds": 45
}
```

**TypeScript 예시**:

```typescript
// 기사 상세 페이지에서 언마운트 시 호출
useEffect(() => {
  const startTime = Date.now();
  return () => {
    const dwellSec = Math.floor((Date.now() - startTime) / 1000);
    if (dwellSec >= 5) {  // 최소 5초 이상일 때만 발송 (네트워크 낭비 방지)
      api.post('/events/article-view', {
        articleId,
        dwellTimeSeconds: dwellSec,
      }).catch(() => {});  // 실패 무시
    }
  };
}, [articleId]);
```

### 2-2. 검색 이벤트

비로그인도 트렌딩 반영. 로그인 시 개인 프로파일에도 반영.

```
POST /api/v1/events/search
Content-Type: application/json

{
  "query": "HBM 메모리"
}
```

```typescript
// 검색 실행 시 호출 (응답 기다리지 않음)
api.post('/events/search', { query }).catch(() => {});
```

### 2-3. 좋아요 이벤트

```
POST /api/v1/events/article-like
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "articleId": "news_abc123"
}
```

### 2-4. 북마크 이벤트

```
POST /api/v1/events/article-bookmark
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "articleId": "news_abc123"
}
```

**이벤트 가중치 참고** (백엔드 내부 처리):

| 이벤트 | 가중치 | 프로파일 반영 |
|--------|--------|--------------|
| 기사 조회 (30초+) | 1.0 | 로그인만 |
| 검색 | 2.0 | 로그인만 |
| 좋아요 | 3.0 | 로그인만 |
| 북마크 | 5.0 | 로그인만 |

---

## 3. 개인화 피드 조회 API

```
GET /api/v1/recommendations/news?size=20
Authorization: Bearer {accessToken}
```

- `size`: 1~50 (기본값 20)
- 인증 필수 — 미인증 시 `401 Unauthorized`

**응답**:

```typescript
interface RecommendationItem {
  articleId: string;
  title: string;
  source: string;
  region: 'DOMESTIC' | 'GLOBAL';
  category: string;
  sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  score: number;
  keywords: string[];
  publishedAt: string;  // ISO 8601
  reason: 'ALS' | 'KEYWORD_MATCH' | 'COLD_START';
}
```

**`reason` 필드 활용 예시**:
- `ALS`: 협업 필터링 기반 추천 → "당신과 비슷한 사용자들이 관심 가진 기사"
- `KEYWORD_MATCH`: 관심 키워드 매칭 → "관심 키워드 기반 추천"
- `COLD_START`: 데이터 부족 (신규 사용자) → "인기 기사"

**캐시 정책**: 30분 TTL (같은 유저의 반복 요청은 캐시 반환)

**TypeScript 예시**:

```typescript
// services/recommendation/recommendationApi.ts (신규 파일)
import api from '../common/api';

export interface RecommendationItem {
  articleId: string;
  title: string;
  source: string;
  region: string;
  category: string;
  sentiment: string;
  score: number;
  keywords: string[];
  publishedAt: string;
  reason: 'ALS' | 'KEYWORD_MATCH' | 'COLD_START';
}

export const recommendationApi = {
  getPersonalizedFeed: (size = 20): Promise<RecommendationItem[]> =>
    api.get(`/recommendations/news?size=${size}`).then(r => r.data),
};
```

---

## 4. 트렌딩 키워드 API (공개)

인증 불필요. 비로그인 사용자에게도 표시 가능.

```
GET /api/v1/recommendations/trending?limit=20
```

```
GET /api/v1/recommendations/trending/hourly?limit=10
```

**응답**: `string[]` — 키워드 목록 (점수 내림차순)

---

## 5. 관심사 관리 API

이미 [userApi.ts](services/user/userApi.ts)에 구현되어 있습니다.

| 메서드 | 설명 |
|--------|------|
| `userApi.getInterests()` | 관심 키워드 목록 조회 |
| `userApi.addInterest(keyword)` | 관심 키워드 추가 |
| `userApi.removeInterest(keyword)` | 관심 키워드 삭제 |

**주의**: 관심사를 추가/삭제하면 추천 캐시(30분 TTL)가 만료된 이후 반영됩니다.
즉각 반영이 필요하면 추가 후 피드를 다시 fetch하세요.

---

## 6. 구현 체크리스트 (프론트엔드)

- [ ] `TokenResponse` 타입에 `onboardingCompleted: boolean` 추가
- [ ] 로그인/회원가입 후 `onboardingCompleted` 확인 → 온보딩 화면 라우팅
- [ ] 온보딩 키워드 선택 화면 구현 (최대 10개 선택)
- [ ] `POST /api/v1/users/me/onboarding` 호출
- [ ] 기사 상세 페이지에 체류 시간 측정 + 조회 이벤트 발송
- [ ] 검색바에 검색 이벤트 발송 연동
- [ ] 좋아요 / 북마크 버튼에 이벤트 발송 연동
- [ ] `GET /api/v1/recommendations/news` 개인화 피드 화면 구현
- [ ] `reason` 필드로 추천 이유 배지 표시 (선택)
