# 온보딩 플로우 명세

> **대상 독자**: 프론트엔드 개발자
> **읽는 데 걸리는 시간**: 약 7분
> **전제 지식**: JWT 인증 기본 개념, React/Next.js 기초

이 문서는 신규 사용자가 관심 키워드를 선택하는 온보딩 플로우를 구현하는 방법을 설명합니다.

---

## 왜 온보딩이 필요한가

신규 가입자는 행동 데이터가 없어 추천 시스템이 `COLD_START` 모드로 동작합니다. 이 상태에서는 모든 사용자에게 동일한 인기 기사만 표시됩니다.

온보딩에서 관심 키워드를 선택하면 즉시 Redis 프로파일에 반영되어 **가입 직후부터 개인화된 피드**를 받을 수 있습니다.

---

## 플로우 전체 흐름

```
[회원가입 / 로그인]
        │
        ▼
  TokenResponse 수신
        │
        ├─ onboardingCompleted === false
        │         │
        │         ▼
        │   관심 키워드 선택 화면 표시
        │         │
        │         ▼
        │   POST /api/v1/users/me/onboarding
        │         │
        │         ▼
        │   200 OK → 메인 화면으로 이동
        │
        └─ onboardingCompleted === true
                  │
                  ▼
            바로 메인 화면으로 이동
```

---

## Step 1: 로그인/회원가입 응답 처리

### TokenResponse 변경 사항

기존 `TokenResponse`에 `onboardingCompleted` 필드가 추가되었습니다.

```typescript
// 변경 전
interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
}

// 변경 후
interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  onboardingCompleted: boolean; // ← 신규 필드
}
```

> **주의**: 기존 타입 정의를 업데이트하지 않으면 TypeScript에서 이 필드를 읽을 수 없습니다. `services/auth/authApi.ts`의 `TokenResponse` 타입을 먼저 수정하세요.

### 로그인 후 라우팅 처리 예시

```typescript
// 로그인 성공 후
const response = await authApi.login({ email, password });

// Access Token 저장
localStorage.setItem('accessToken', response.accessToken);
localStorage.setItem('refreshToken', response.refreshToken);

// 온보딩 완료 여부에 따라 분기
if (!response.onboardingCompleted) {
  router.push('/onboarding');  // 관심 키워드 선택 화면
} else {
  router.push('/dashboard');   // 메인 화면
}
```

**두 엔드포인트 모두 동일한 처리가 필요합니다**:
- `POST /api/v1/auth/register` — 회원가입
- `POST /api/v1/auth/login` — 로그인

---

## Step 2: 온보딩 화면 구현

### 키워드 선택 UI 요구사항

- 최소 **1개** 이상 선택해야 완료 버튼 활성화
- 최대 **10개**까지 선택 가능
- 선택 초과 시 사용자에게 안내 메시지 표시

### 추천 키워드 목록

아래 카테고리를 선택지로 제공하세요. 이 목록은 `KeywordDictionary.tsx`의 카테고리와 일치합니다.

**개념/이론**
- 에이전틱 워크플로우, RAG, 멀티모달 AI, 파인튜닝, 프롬프트 엔지니어링, 강화학습

**모델**
- GPT-4o, Claude 3.5 Sonnet, Llama 3, Gemini, Mistral

**하드웨어/인프라**
- GPU, HBM, NPU, 반도체, 데이터센터, 클라우드

**산업/응용**
- 자율주행, 로보틱스, AI 에이전트, 헬스케어 AI, 생성형 AI

> 이 목록은 백엔드 제약 없이 프론트엔드에서 자유롭게 수정할 수 있습니다. 백엔드는 키워드 문자열을 그대로 저장합니다.

---

## Step 3: 온보딩 완료 API 호출

### 엔드포인트

```
POST /api/v1/users/me/onboarding
Authorization: Bearer {accessToken}
Content-Type: application/json
```

### 요청 Body

```json
{
  "keywords": ["AI", "LLM", "GPU", "반도체"]
}
```

| 필드 | 타입 | 필수 | 제약 |
|------|------|------|------|
| `keywords` | `string[]` | 필수 | 1~10개, 각 항목 빈 문자열 불가 |

### 응답

| 상태 코드 | 의미 | 처리 방법 |
|-----------|------|-----------|
| `200 OK` | 온보딩 완료 | 메인 화면으로 이동 |
| `400 Bad Request` | 유효성 검사 실패 (키워드 0개 또는 10개 초과) | 에러 메시지 표시 |
| `401 Unauthorized` | 인증 토큰 없음 또는 만료 | 로그인 화면으로 이동 |
| `409 Conflict` | 이미 온보딩이 완료된 계정 | 메인 화면으로 바로 이동 |

### API 호출 예시

```typescript
// services/user/userApi.ts에 추가
async function completeOnboarding(keywords: string[]): Promise<void> {
  await api.post('/users/me/onboarding', { keywords });
}
```

```typescript
// 온보딩 화면 컴포넌트에서
const handleComplete = async () => {
  if (selectedKeywords.length === 0) return;

  try {
    await userApi.completeOnboarding(selectedKeywords);
    router.push('/dashboard');
  } catch (error) {
    if (error.response?.status === 409) {
      // 이미 완료된 계정 — 그냥 이동
      router.push('/dashboard');
    } else {
      setError('온보딩 저장 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
  }
};
```

---

## 온보딩 완료 후 동작

온보딩이 완료되면 백엔드에서 다음 세 가지가 동시에 처리됩니다.

1. **`user_interests` 테이블 저장**: 선택한 키워드가 DB에 영구 저장됩니다.
2. **Redis 프로파일 즉시 반영**: `user:{userId}:profile` Hash에 각 키워드가 가중치 `1.0`으로 기록됩니다.
3. **`users.onboarding_completed = true`**: 다음 로그인 시 온보딩 화면을 다시 보지 않습니다.

**추천 반영 시점**: Redis에 즉시 반영되므로 온보딩 완료 직후 `GET /api/v1/recommendations/news`를 호출하면 선택한 키워드에 맞는 기사가 나옵니다.

---

## 엣지 케이스 처리

### 온보딩 화면에서 뒤로가기를 누른 경우

온보딩을 건너뛴 사용자는 `COLD_START` 상태로 서비스를 이용합니다. 이후 관심사를 직접 추가하면 추천이 개선됩니다.

온보딩을 강제하지 않으려면 "나중에 설정" 버튼을 두고 메인으로 이동하도록 구현하세요. 다음 로그인 때 `onboardingCompleted === false`이면 다시 온보딩 화면을 보여줄 수 있습니다.

### 관심사 수동 추가/삭제

온보딩 완료 후에도 프로필 페이지에서 관심사를 수정할 수 있습니다. 기존 `userApi.addInterest()` / `userApi.removeInterest()`를 사용하세요.

---

## 관련 문서

- [이벤트 발송 API 명세](./03-event-api.md) — 조회/검색/좋아요 이벤트로 추천을 더 정확하게
- [개인화 피드 API 명세](./04-feed-api.md) — 온보딩 완료 후 피드 화면 구현
- [추천 시스템 아키텍처 개요](./01-architecture-overview.md) — 전체 구조 이해
