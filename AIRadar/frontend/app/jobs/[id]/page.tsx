'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { JobHeader, CoreTaskCard, ScenarioModal, SkillPrepCard } from '@/components/features/jobs';

// --- Dummy Data ---
const jobData = {
  title: '주니어 프론트엔드 개발자',
  category: '개발',
  aiRiskScore: 6.5,
  coreTasks: [
    {
      title: '피그마 시안을 바탕으로 하는 단순 마크업 자동화',
      description: 'AI가 디자인 파일을 인식하고 초기 React/HTML 코드를 빠르게 생성하여 개발 초기 세팅 시간을 대폭 단축합니다.',
      sources: [
        { type: 'paper' as const, text: '분석 완료', impact: 'HIGH' as const },
        { type: 'news' as const, text: '12건 기반' }
      ],
      scenario: {
        title: 'AI Code Gen - 상세 시나리오',
        description: '피그마 시안을 바탕으로 하는 단순 마크업 자동화',
        steps: [
          'AI가 피그마 디자인을 분석하여 컴포넌트 구조를 파악합니다.',
          '자동으로 HTML/CSS 코드를 생성하고 React 컴포넌트로 변환합니다.',
          '개발자는 생성된 코드를 검토하고 비즈니스 로직을 추가합니다.',
          '반복적인 마크업 작업 시간을 70% 단축할 수 있습니다.'
        ]
      }
    },
    {
      title: '코드 리뷰 및 버그 탐지 자동화',
      description: 'PR 시 AI가 린트 및 베스트 프랙티스 기반으로 기본 리뷰를 수행하여 코드 품질을 안정적으로 유지합니다.',
      sources: [
        { type: 'paper' as const, text: '분석 완료', impact: 'MEDIUM' as const },
        { type: 'news' as const, text: '12건 기반' }
      ],
      scenario: {
        title: 'AI Code Review - 상세 시나리오',
        description: '코드 리뷰 및 버그 탐지 자동화',
        steps: [
          'GitHub PR이 생성되면 AI 봇이 즉각 코드를 분석합니다.',
          '잠재적 버그, 안티 패턴, 성능 이슈를 코멘트로 남깁니다.',
          '개발자는 AI의 피드백을 수용하여 코드 품질을 개선합니다.'
        ]
      }
    },
    {
      title: '테스트 케이스 자동 생성',
      description: '작성된 컴포넌트와 유틸 함수에 대응하는 Jest/Testing Library 테스트 보일러플레이트를 자동 생성합니다.',
      sources: [
        { type: 'paper' as const, text: '분석 완료', impact: 'MEDIUM' as const },
        { type: 'news' as const, text: '12건 기반' }
      ],
      scenario: {
        title: 'AI Test Gen - 상세 시나리오',
        description: '테스트 케이스 자동 생성',
        steps: [
          '완성된 컴포넌트의 props와 로직을 텍스트 파일과 함께 분석합니다.',
          'Edge case를 커버하는 TDD 기반 테스트 코드 초안을 출력합니다.',
          '인간 개발자가 복잡한 상태 조건만 추가 보완하여 커버리지를 높입니다.'
        ]
      }
    }
  ],
  prepInfo: {
    uniqueSkills: ['UI/UX 디테일 조정', '복잡한 비즈니스 로직 설계'],
    recommendedSkills: ['AI 기반 코딩 툴 숙련도', '시스템 아키텍처 이해'],
    tools: ['v0.dev', 'Cursor', 'GitHub Copilot']
  }
};

export default function JobDetailPage() {
  const [selectedScenario, setSelectedScenario] = useState<any>(null);

  const handleCloseModal = () => setSelectedScenario(null);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-8 py-8 flex flex-col min-h-screen">
      
      {/* 백 버튼 */}
      <div className="mb-4">
        <Link href="/jobs" className="inline-flex items-center text-sm font-semibold text-gray-500 hover:text-[var(--color-accent)] transition-colors">
          <ArrowLeft className="w-4 h-4 mr-1" /> 직업 검색으로 돌아가기
        </Link>
      </div>

      <JobHeader 
        jobTitle={jobData.title} 
        category={jobData.category}
        aiRiskScore={jobData.aiRiskScore}
      />

      <div className="flex flex-col lg:flex-row gap-8 mt-6">
        
        {/* 왼쪽 핵심 업무 리스트 영역 */}
        <div className="flex-1 flex flex-col gap-6">
          {jobData.coreTasks.map((task, idx) => (
            <CoreTaskCard 
              key={idx}
              number={idx + 1}
              title={task.title}
              description={task.description}
              sources={task.sources}
              onOpenScenario={() => setSelectedScenario(task.scenario)}
            />
          ))}
        </div>

        {/* 오른쪽 스킬 & 대비 방안 영역 */}
        <div className="w-full lg:w-80 shrink-0">
          <SkillPrepCard 
            uniqueSkills={jobData.prepInfo.uniqueSkills}
            recommendedSkills={jobData.prepInfo.recommendedSkills}
            tools={jobData.prepInfo.tools}
          />
        </div>

      </div>

      {/* 시나리오 팝업 모달 */}
      <ScenarioModal 
        isOpen={!!selectedScenario}
        onClose={handleCloseModal}
        title={selectedScenario?.title || ''}
        description={selectedScenario?.description || ''}
        steps={selectedScenario?.steps || []}
      />

    </div>
  );
}
