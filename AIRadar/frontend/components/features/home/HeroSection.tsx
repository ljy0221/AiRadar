import { ChevronDown } from 'lucide-react';

export const HeroSection = () => {
  return (
    <>
      {/* 
        🔥 최종 수정 구조 (Klein Private Equity 레퍼런스 완벽 일치)
        - 투명한 요소는 완전히 제거하고 헤더와 동일한 불투명(단색) 배경을 적용합니다.
        - 위에 글씨가 있는 만큼만 하얀색 배경 덩어리가 유동적으로 크기를 차지합니다.
        - 화면 전체에서 남는 모든 밑 공간(flex-1)을 패럴랙스 고정된 사진으로 시원하게 보여줍니다!
      */}
      <section className="w-full relative min-h-[90vh] md:min-h-screen text-center overflow-hidden bg-[var(--color-bg-primary)] flex flex-col">

        {/* 라이트 모드용 패럴랙스 배경 (항상 맨 밑바닥에 완전 화면 크기로 깔려 있음) */}
        <div
          className="absolute inset-0 z-0 opacity-100 dark:opacity-0 transition-opacity duration-500 bg-fixed bg-cover bg-bottom"
          style={{ backgroundImage: 'url("/hero-day.png?v=4")' }}
        />

        {/* 다크 모드용 패럴랙스 배경 */}
        <div
          className="absolute inset-0 z-0 opacity-0 dark:opacity-100 transition-opacity duration-500 bg-fixed bg-cover bg-bottom"
          style={{ backgroundImage: 'url("/hero-night.jpg?v=4")' }}
        />

        {/* 1. 상단 텍스트 영역: 왼쪽 정렬 + 세리프 폰트 적용 */}
        <div className="w-full relative z-20 shrink-0 bg-[var(--color-bg-primary)] flex flex-col items-start justify-center pt-7 pb-2 md:pt-9 md:pb-2">
          <div className="max-w-5xl w-full flex flex-col items-start gap-1 px-8 md:px-16 translate-y-3 md:translate-y-3">
            <h1 className="font-serif text-7xl md:text-[7rem] lg:text-[8.5rem] font-normal tracking-tight text-slate-800 dark:text-white leading-none">
              AI Radar
            </h1>
            <h2 className="font-sans text-lg md:text-2xl font-semibold mt-0 text-slate-700 dark:text-gray-200 tracking-wide">
              데이터가 증명하는 내일, 가장 먼저 AI 선행 신호를 포착하다
            </h2>
          </div>
        </div>

        {/* 1-5. 그라디언트 오버레이: 텍스트가 묻히는 것을 방지하기 위해 상단에서 아래로 부드럽게 퍼지는 그라디언트 추가 */}
        <div className="absolute top-0 left-0 w-full h-[400px] z-10 bg-gradient-to-b from-[var(--color-bg-primary)] via-[var(--color-bg-primary)]/70 to-transparent pointer-events-none" />

        {/* 2. 하단 여백 영역: 화면 전체(min-h-screen)에서 위쪽 글씨 박스가 차지한 공간을 제외한 모든 남는 공간(flex-1)을 사진으로 꽉꽉 채워줍니다! */}
        <div className="w-full relative z-20 flex-1 bg-transparent flex items-end justify-center pb-12">
          {/* 뒤에 깔린 사진 때문에 화살표가 잘 안보일까바 반투명 동그라미 추가 */}
          <div className="bg-white/40 dark:bg-black/40 backdrop-blur-sm p-3 rounded-full animate-bounce">
            <ChevronDown className="w-10 h-10 text-slate-800 dark:text-slate-200" />
          </div>
        </div>
      </section>
    </>
  );
};
