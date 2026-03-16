---
name: frontend_convention
description: AIRadar 프론트엔드(Next.js 15 + TypeScript + TailwindCSS + TanStack Query)의 폴더 구조, 네이밍 규칙, 상태 관리, API 연동 패턴을 안내합니다. 프론트엔드 코드를 작성하거나 수정할 때 반드시 참고하세요.
---

# AIRadar 프론트엔드 컨벤션

## 기술 스택
- **프레임워크**: Next.js 15 (App Router)
- **언어**: TypeScript
- **스타일**: TailwindCSS (Mobile First)
- **서버 상태**: TanStack Query (React Query)
- **전역 상태**: Zustand (store/ 폴더)
- **HTTP 클라이언트**: services/api.ts 기반 Axios 혹은 fetch 래퍼

## 폴더 구조

```
frontend/
├── app/                    # Next.js App Router 페이지
│   ├── dashboard/
│   ├── jobs/
│   └── news/
├── components/
│   ├── common/             # 재사용 원자 UI (Button, Modal, Badge 등) - 비즈니스 로직 없음
│   ├── features/           # 도메인 복합 컴포넌트 (dashboard/, news/, jobs/, search/, home/)
│   └── layout/             # Header, Sidebar, Footer 등 뼈대 컴포넌트
├── hooks/                  # 커스텀 훅 (hooks/queries/ 하위에 TanStack Query 훅 분리)
├── lib/                    # 순수 유틸리티 함수 (formatters, utils 등)
├── services/               # API 통신 로직 (dashboardApi.ts, newsApi.ts 등)
├── store/                  # 전역 상태 (Zustand 스토어)
└── types/                  # 공통 TypeScript 타입 정의
```

## 네이밍 규칙
| 대상 | 규칙 | 예시 |
|---|---|---|
| 폴더명 | 소문자 kebab-case | `components/common`, `app/dashboard` |
| React 컴포넌트 파일 | PascalCase | `TrendChart.tsx`, `Button.tsx` |
| 훅/유틸/서비스 파일 | camelCase | `useFetch.ts`, `formatters.ts`, `dashboardApi.ts` |

## API 연동 패턴 (TanStack Query)
- API 호출 로직은 컴포넌트 내부에 직접 쓰지 않고 `hooks/queries/` 하위 커스텀 훅으로 분리
- 실제 fetch 함수는 `services/` 폴더에 정의
- 백엔드 미연동 시 `services/` 파일 내 mock 데이터로 대체 후, 실 API 연동 시 교체

```typescript
// hooks/queries/useNewsQuery.ts 예시
import { useQuery } from '@tanstack/react-query';
import { fetchNews } from '@/services/newsApi';

export const useNewsQuery = (keyword: string) => {
  return useQuery({
    queryKey: ['news', keyword],
    queryFn: () => fetchNews(keyword),
    staleTime: 1000 * 60 * 5, // 5분 캐싱
  });
};
```

## 반응형 가이드
- 기본 스타일 = 모바일, `md:` / `lg:` 브레이크포인트로 대형 화면 대응
- 고정 px 대신 `%`, `rem`, Flexbox, Grid 우선
- 표/차트는 `overflow-x-auto` 처리

## 주의사항
- `components/common` 컴포넌트는 특정 도메인 API를 직접 호출하지 않는다
- `app/` 라우트 폴더에는 `page.tsx`, `layout.tsx`만 권장 (단일 사용 컴포넌트는 `_components/` 하위 co-location 허용)
- 더미 데이터 사용 시 서비스 파일에 `// TODO: replace with real API` 주석 필수
