import { BacktestingChart } from './BacktestingChart';
import { CorrelationChart } from './CorrelationChart';

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
            <h4 className="text-xl md:text-2xl font-bold">모델의 높은 예측 정확도</h4>
            <div className="text-sm opacity-70 flex flex-col gap-1 items-center md:items-start">
              <span>과거 데이터를 바탕으로 당사 AI 모델의 트렌드 예측과</span>
              <span>실제 시장 동향(채용 공고, 오픈소스 트렌드 등)을 비교 분석하여</span>
              <span>높은 일치도와 데이터 신뢰성을 확보했습니다.</span>
            </div>
          </div>
          <div className="flex-1 w-full bg-white dark:bg-[#1a1c2e] rounded-xl aspect-[4/3] flex items-center justify-center border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
            <BacktestingChart />
          </div>
        </div>

        {/* 두번째 특징 */}
        <div className="flex flex-col md:flex-row-reverse items-center justify-between gap-8 md:gap-16">
          <div className="flex-1 text-center md:text-right flex flex-col items-center md:items-end gap-4">
            <h4 className="text-xl md:text-2xl font-bold">다각도 데이터 상관관계 분석</h4>
            <div className="text-sm opacity-70 flex flex-col gap-1 items-center md:items-end">
              <span>GitHub 등 개발 생태계의 움직임, 뉴스 매체의 관심도,</span>
              <span>그리고 Arxiv 학술 논문 발행량 데이터를 종합하여</span>
              <span>입체적이고 앞서가는 인사이트를 제공합니다.</span>
            </div>
          </div>
          <div className="flex-1 w-full bg-white dark:bg-[#1a1c2e] rounded-xl aspect-[4/3] flex items-center justify-center border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
            <CorrelationChart />
          </div>
        </div>
      </div>
    </section>
  );
};
