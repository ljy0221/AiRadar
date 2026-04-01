# AI Radar (프론트엔드)

AI 트렌드를 분석하고 예측한 결과를 보여주는 웹사이트 프로젝트입니다.

## 프로젝트 디렉토리 구조 및 규칙

본 프로젝트는 유지보수성과 가독성을 높이기 위해 **관심사 분리(Separation of Concerns)** 원칙에 따라 디렉토리를 세분화하여 관리합니다. 팀원 모두가 아래의 규칙을 숙지하고 개발에 참여해 주세요.

### 1. `components` 디렉토리 규칙
`components` 폴더는 목적과 재사용성에 따라 크게 3가지 계층으로 분리합니다.

*   **`common` (또는 `ui`, `shared`)**
    *   **역할:** 프로젝트 어디서든 재사용 가능한 원자(Atomic) 단위의 UI 컴포넌트입니다.
    *   **예시:** `Button`, `Input`, `Modal`, `Badge`, `Checkbox`
    *   **규칙:** 특정 도메인이나 비즈니스 로직(API 호출 등)에 의존하지 않아야 합니다. 데이터나 스타일은 순수하게 `props`를 통해서만 주입받습니다.
    *   **사용법:** `components/common/index.ts`를 통해 내보내어, `import { Button } from '@/components/common'` 형태로 깔끔하게 사용합니다.

*   **`features` (또는 `domain`)**
    *   **역할:** 특정 기능이나 도메인의 **비즈니스 로직**을 담고 있는 복합 컴포넌트입니다.
    *   **예시:** `dashboard/TrendChart`, `auth/LoginForm`, `jobs/JobCard`
    *   **규칙:** `common`의 기본 UI 컴포넌트들을 조합하여 생성하며, 해당 기능 도메인 내에서만 사용됩니다. 규모가 커질 경우 각 도메인 폴더(`dashboard`, `jobs`, `news`) 하위로 세분화합니다.

*   **`layout`**
    *   **역할:** 페이지 또는 사이트 전체의 뼈대를 잡는 컴포넌트입니다.
    *   **예시:** `Header`, `Sidebar`, `Footer`, `MainLayout`
    *   **규칙:** 라우팅(`app/layout.tsx` 등)에서 주로 로드되며, 전체적인 UI 규격을 정의합니다.

### 2. 기타 주요 디렉토리

*   **`app/` (Next.js App Router)**
    *   페이지 라우팅을 담당합니다. (`/dashboard`, `/jobs`, `/news` 등)
    *   각 라우팅 폴더 안에는 해당 라우트에 해당하는 `page.tsx`, `layout.tsx` 파일만 위치하는 것을 권장합니다.
    *   *Tip: 딱 한 페이지에서만 사용되는 작은 컴포넌트라면 `features`에 두기보다 `app/라우트경로/_components`에 직접 두는 방식(Co-location)도 허용됩니다.*

*   **`hooks/`**
    *   커스텀 React Hook들을 보관합니다. (`useFetch`, `useAuth` 등)

*   **`lib/`**
    *   공통으로 사용되는 순수 자바스크립트/타입스크립트 유틸리티 함수들을 모아둡니다. (`formatters`, `utils` 등)

*   **`services/`**
    *   API 서버와의 통신 및 외부 서비스 연동 로직을 관리합니다.

*   **`store/`**
    *   전역 상태 관리(Zustand, Jotai, Redux 등) 스토어를 구성합니다.

*   **`types/`**
    *   프로젝트 전반에서 쓰이는 공통 TypeScript 타입(interface, type alias)을 정의합니다.

*   **`public/`**
    *   Next.js에서 제공하는 정적 파일 서빙용 폴더입니다.
    *   웹사이트에서 직접적으로 노출되는 정적 에셋(이미지, 파비콘, 폰트 파일, 로고 등)을 보관합니다.
    *   `public/` 내부에 저장된 파일은 브라우저에서 `/파일이름` 형태로 서버 실행 시점부터 전역적으로 접근 가능합니다. (예: `public/logo.png` -> `<img src="/logo.png" />`)
    *   [주의 사항]: 소스 코드(src 등) 내에서 빌드해야 하는 동적인 이미지나 외부에서 import가 필요한 에셋이 아니라면 가급적 이 `public` 폴더 안에 넣고 관리합니다.


## 반응형 웹(Responsive Web) 가이드라인

본 프로젝트는 모바일과 데스크톱 환경 모두에서 최적의 사용자 경험(UX)을 제공해야 합니다. (Mobile First 권장)

*   **Tailwind CSS 반응형 유틸리티 활용:**
    *   기본 클래스는 모바일(작은 화면) 기준으로 작성하고, `md:`, `lg:` 등의 브레이크포인트를 사용하여 큰 화면에 대한 스타일을 덮어씁니다.
    *   *예시:* `className="flex flex-col md:flex-row"` (모바일에선 세로 배치, 태블릿 이상에선 가로 배치)
*   **유연한 레이아웃 구성:**
    *   고정된 픽셀(px)보다는 상대 단위(`%`, `vw`, `vh`, `rem`)와 Flexbox, Grid를 적극적으로 활용합니다.
*   **컴포넌트 설계 시 고려사항:**
    *   표(Table)나 차트(Chart) 등 넓은 가로 영역이 필요한 컴포넌트는 모바일에서 스크롤(`overflow-x-auto`) 처리를 하거나 디자인을 변형하여 화면이 깨지지 않도록 방지합니다.

---

## 📝 파일 및 폴더 네이밍 규칙 (중요!)

협업을 위해 다음과 같은 폴더 및 파일 네이밍 룰을 따릅니다.

*   **폴더명:** **모두 소문자 (kebab-case 권장)** 로 작성합니다.
    *   ✅ `components/common`, `components/features`, `app/dashboard`
    *   ❌ `components/Common`, `App/Dashboard`
*   **파일명 (React 컴포넌트):** **PascalCase** 로 작성합니다.
    *   ✅ `Button.tsx`, `TrendChart.tsx`, `LoginForm.tsx`
    *   ❌ `button.tsx`, `trend-chart.tsx`
*   **기타 파일명 (유틸, 훅스, 서비스 등):** **camelCase** 로 작성합니다.
    *   ✅ `useFetch.ts`, `formatters.ts`, `authApi.ts`, `index.ts`
    *   ❌ `use_fetch.ts`, `Formatters.ts`, `AuthApi.ts`

---

## 상태관리 및 캐싱 

*   **TanStack Query (React Query)**
    *   **도입 목적:** 서버 상태(Server State) 관리와 클라이언트 상태(Client State)를 명확히 분리하고, API 데이터 페칭, 캐싱, 동기화 및 업데이트 로직을 단순화하기 위해 사용합니다.
    *   **주요 장점:**
        *   자동 캐싱 및 만료(Stale)에 따른 백그라운드 데이터 갱신(Refetching)
        *   Loading, Error 등 비동기 상태의 선언적 처리 용이
        *   불필요한 API 중복 호출 방지 및 성능 최적화
    *   **사용 권장 패턴 (커스텀 훅):** API 호출 로직은 컴포넌트 내부에 직접 작성하지 않고, `hooks/queries/`와 같은 폴더에 커스텀 훅(Custom Hook) 형태로 분리하여 재사용성을 높이는 것을 권장합니다.
        ```typescript
        // 예시: hooks/queries/useNewsQuery.ts
        import { useQuery } from '@tanstack/react-query';
        import { fetchNews } from '@/services/newsApi';

        export const useNewsQuery = (keyword: string) => {
          return useQuery({
            queryKey: ['news', keyword],
            queryFn: () => fetchNews(keyword),
            staleTime: 1000 * 60 * 5, // 5분
          });
        };
        ```
    *   **Mutation 처리:** 데이터 생성, 수정, 삭제 요청은 `useMutation`을 활용하며, 성공 시 `queryClient.invalidateQueries`를 통해 연관된 캐시 데이터를 효과적으로 업데이트합니다.

### TEST