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

---