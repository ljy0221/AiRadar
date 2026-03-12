export const FeatureSection = () => {
  return (
    <section className="w-full max-w-5xl px-4 py-24 flex flex-col items-center">
      <h3 className="text-2xl md:text-4xl font-bold text-center mb-24 leading-tight">
        주관적일 수 있는 <span className="text-[var(--color-accent)] relative inline-block">
          AI 트렌드 예측
          <span className="absolute bottom-0 left-0 w-full h-1 bg-[var(--color-accent)] transform translate-y-2"></span>
        </span>,<br className="hidden md:block"/>
        <span className="mt-4 inline-block">과거 데이터 백테스팅으로 검증했습니다.</span>
      </h3>
      
      <div className="flex flex-col gap-24 w-full">
        {/* 첫번째 특징 */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 md:gap-16">
          <div className="flex-1 text-center md:text-left flex flex-col items-center md:items-start gap-4">
            <h4 className="text-xl md:text-2xl font-bold">선행 지표의 힘: 코드가 먼저 움직입니다.</h4>
            <div className="text-sm opacity-70 flex flex-col gap-1 items-center md:items-start">
              <span>참조 지표 설명</span>
              <span>데이터 기반 실증 분석 내용</span>
            </div>
          </div>
          <div className="flex-1 w-full bg-gray-200 dark:bg-[#1a1c2e] rounded-xl aspect-[4/3] flex items-center justify-center border border-gray-300 dark:border-gray-800 shadow-sm">
            <span className="text-gray-400">차트 영역 플레이스홀더</span>
          </div>
        </div>

        {/* 두번째 특징 */}
        <div className="flex flex-col md:flex-row-reverse items-center justify-between gap-8 md:gap-16">
          <div className="flex-1 text-center md:text-right flex flex-col items-center md:items-end gap-4">
            <h4 className="text-xl md:text-2xl font-bold">선행 지표의 힘: 코드가 먼저 움직입니다.</h4>
            <div className="text-sm opacity-70 flex flex-col gap-1 items-center md:items-end">
              <span>심층 원리 설명</span>
              <span>데이터 아키텍처 개요</span>
            </div>
          </div>
          <div className="flex-1 w-full bg-gray-200 dark:bg-[#1a1c2e] rounded-xl aspect-[4/3] flex items-center justify-center border border-gray-300 dark:border-gray-800 shadow-sm">
            <span className="text-gray-400">이미지 영역 플레이스홀더</span>
          </div>
        </div>
      </div>
    </section>
  );
};
