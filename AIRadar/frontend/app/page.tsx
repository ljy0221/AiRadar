import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold text-gray-900">AI 트렌드 분석 예측에 오신 것을 환영합니다!</h1>
      <p className="text-gray-600 font-medium">
        다양한 AI 관련 데이터와 트렌드를 한 눈에 확인하세요.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
        <Link href="/dashboard" className="p-6 border border-gray-200 rounded-lg hover:shadow-lg transition-shadow bg-white flex flex-col gap-2">
          <div className="text-blue-500 font-bold text-xl">대시보드</div>
          <p className="text-sm text-gray-500 leading-relaxed">핵심 AI 트렌드 지표와 전체적인 요약을 한 곳에서 빈틈없이 확인합니다.</p>
        </Link>
        <Link href="/jobs" className="p-6 border border-gray-200 rounded-lg hover:shadow-lg transition-shadow bg-white flex flex-col gap-2">
          <div className="text-green-500 font-bold text-xl">직업별 분류</div>
          <p className="text-sm text-gray-500 leading-relaxed">각 직무별 AI 활용도 및 기술 트렌드 변화와 영향도를 깊이 있게 분석합니다.</p>
        </Link>
        <Link href="/news" className="p-6 border border-gray-200 rounded-lg hover:shadow-lg transition-shadow bg-white flex flex-col gap-2">
          <div className="text-purple-500 font-bold text-xl">뉴스</div>
          <p className="text-sm text-gray-500 leading-relaxed">전 세계의 신뢰할 수 있는 출처로부터 AI 관련 최신 뉴스 기사를 모아봅니다.</p>
        </Link>
      </div>
    </div>
  );
}
