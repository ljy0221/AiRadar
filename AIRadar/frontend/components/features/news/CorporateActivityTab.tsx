'use client';

import { CompanyActivityCard } from './CompanyActivityCard';

const dummyCorporateData = [
  {
    id: 'openai',
    name: 'OpenAI',
    initial: 'O',
    color: '#10a37f', // OpenAI Green
    progress: 85,
    activities: [
      { date: '2025.03.01', category: '모델 출시', title: 'GPT-5 알파 버전 일부 파트너사 대상 비공개 테스트 시작' },
      { date: '2025.02.15', category: '기업 인수', title: '비디오 생성 AI 스타트업 "VisionFlow" 전격 인수' },
      { date: '2025.01.20', category: '정책/규정', title: '강화된 딥페이크 방지 워터마킹 기술 전면 도입' },
    ]
  },
  {
    id: 'google',
    name: 'Google (DeepMind)',
    initial: 'G',
    color: '#4285F4', // Google Blue
    progress: 72,
    activities: [
      { date: '2025.02.28', category: '모델 출시', title: '초거대 멀티모달 프레임워크 Gemini 2.0 Ultra 글로벌 런칭' },
      { date: '2025.02.10', category: '개발/오픈소스', title: '의료/바이오 특화 AI 모델 Med-PaLM v3 논문 및 API 공개' },
      { date: '2025.01.05', category: '조직 개편', title: '구글 브레인과 딥마인드 조직 통합 가속화 및 리더십 재편' },
    ]
  },
  {
    id: 'meta',
    name: 'Meta',
    initial: 'M',
    color: '#0668E1', // Meta Blue
    progress: 68,
    activities: [
      { date: '2025.03.05', category: '오픈소스', title: '고성능 매개변수 공유 기반 LLaMA-4 아키텍처 초안 GitHub 공개' },
      { date: '2025.01.30', category: '인프라/하드웨어', title: '자체 개발 차세대 AI 추론 칩(MTIA v3) 데이터센터 적용 확대' },
    ]
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    initial: 'A',
    color: '#D19B6D', // Anthropic Peach/Brown (임의)
    progress: 90,
    activities: [
      { date: '2025.03.02', category: '투자/펀딩', title: '아마존으로부터 20억 달러 추가 투자 유치 확정' },
      { date: '2025.02.20', category: '알고리즘', title: '헌법적 AI(Constitutional AI) 기반의 자가 수정 알고리즘 특허 출원' },
      { date: '2025.01.12', category: '경영/전략', title: 'B2B 엔터프라이즈 전용 Claude Pro 요금제 개편 및 기능 추가' },
    ]
  }
];

export const CorporateActivityTab = () => {
  return (
    <div className="w-full flex justify-center py-6">
      <div className="w-full max-w-4xl">
        
        {/* 설명 (옵셔널) */}
        <div className="mb-8 flex justify-between items-end">
          <p className="text-gray-500 text-sm">주요 AI 선도 기업들의 핵심 활동 및 오픈소스 타임라인</p>
        </div>

        {/* 기업 목록 렌더링 */}
        <div className="flex flex-col gap-2">
          {dummyCorporateData.map((company) => (
               <CompanyActivityCard key={company.id} company={company} />
          ))}
        </div>

      </div>
    </div>
  );
};
