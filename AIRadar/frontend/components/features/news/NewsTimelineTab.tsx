'use client';

import { useState } from 'react';
import { TimelineFilter } from './TimelineFilter';
import { TimelineItem, TimelineItemData } from './TimelineItem';

// --- Dummy Data ---
const dummyTimelineData: { dateText: string; items: TimelineItemData[] }[] = [
  {
    dateText: '2025년 3월 6일 (금)',
    items: [
      {
        id: '1',
        category: '채용/교육',
        region: '국내',
        title: '삼성전자, AI 반도체 전담 조직 신설... 1,200명 규모 채용 예고',
        summary: '삼성전자가 AI 반도체 개발을 위한 별도 사업부를 신설하고, 올해 상반기 안에 1,200명 규모의 대규모 채용을 진행한다. 주요 채용 분야는 AI 칩 설계, MLOPS, 시스템 아키텍처 등이다.',
        publisher: '매일경제',
        date: '2025.03.01 16:45',
        hashtags: ['삼성전자', 'AI반도체', '채용', '사업부신설'],
        isHot: true
      },
      {
        id: '2',
        category: '채용/교육',
        region: '국내',
        title: '네이버 클라우드, 고려대와 산학협력 맺고 생성형 AI 특화 인재 양성',
        summary: '네이버가 고려대학교와 손잡고 생성형 AI 실무형 인재 육성을 위한 전공 트랙을 엽니다. 학부생 대상으로 클로바 스튜디오 활용 실습과 프로젝트 멘토링이 포함됩니다.',
        publisher: '한국경제',
        date: '2025.03.01 14:20',
        hashtags: ['네이버클라우드', '산학협력', '인재양성'],
        isHot: true
      }
    ]
  },
  {
    dateText: '2025년 3월 7일 (토)',
    items: [
      {
        id: '3',
        category: '기술/연구',
        region: '해외',
        title: 'OpenAI, 모바일 환경에 최적화된 초경량 On-Device 모델 공개',
        summary: '오픈AI가 스마트폰 등 모바일 엣지 디바이스에서도 인터넷 연결 없이 부드럽게 돌아가는 새로운 초경량 거대 언어 모델을 오픈소스로 발표했습니다.',
        publisher: 'TechCrunch',
        date: '2025.03.02 09:10',
        hashtags: ['OpenAI', 'OnDeviceAI', '경량화모델'],
        isHot: true
      },
      {
        id: '4',
        category: '정책/규제',
        region: '해외',
        title: 'EU, 인공지능법(AI Act) 세부 가이드라인 초안 발표... "투명성 요건 강화"',
        summary: '유럽연합 집행위원회가 AI Act의 기업 적용을 위한 구체적인 세부 가이드라인 초안을 공개했습니다. 고위험 AI를 배포하는 기업은 학습 데이터셋의 출처와 바이어스 완화 조치를 명시해야 합니다.',
        publisher: '블룸버그',
        date: '2025.03.02 11:30',
        hashtags: ['EU', 'AI법안', '규제', '투명성'],
      }
    ]
  }
];

export const NewsTimelineTab = () => {
  const [category, setCategory] = useState<'all' | 'domestic' | 'international'>('all');

  // 실제 연동 시 category 필터에 따른 데이터 필터링 로직 추가
  const filteredData = dummyTimelineData; // 더미 데이터이므로 그대로 사용

  return (
    <div className="w-full flex justify-center py-6">
      <div className="w-full max-w-4xl">
        <TimelineFilter currentCategory={category} setCategory={setCategory} />

        <div className="mt-8 flex flex-col gap-10">
          {filteredData.map((group, gIdx) => (
            <div key={gIdx} className="relative">
              
              {/* 날짜 헤더 영역 */}
              <div className="flex items-center gap-3 mb-6 relative z-10">
                <div className="w-4 h-4 rounded-full bg-[var(--color-accent)] opacity-80" />
                <h3 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-gray-200">
                  {group.dateText}
                </h3>
              </div>

              {/* 해당 날짜의 뉴스 아이템 리스트 래퍼 (왼쪽 세로선 포함) */}
              <div className="relative border-l-2 border-gray-200 dark:border-gray-800 ml-2">
                <div className="flex flex-col gap-4">
                  {group.items.map((item, iIdx) => (
                    <TimelineItem key={iIdx} data={item} />
                  ))}
                </div>
              </div>

            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
