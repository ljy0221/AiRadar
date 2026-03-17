export interface TechLifecycleDto {
  keyword: string;
  status: 'RISING' | 'PEAK' | 'STABLE' | 'DECLINING';
  peakDate: string | null;
  firstSeenDate: string;
  trendScore: number;
  velocity: number;
  weekOverWeek: number;
  relatedKeywords: string[];
}

export interface KeywordDailyRaw {
  keyword: string;
  date: string;
  paperMentions: number;
  githubActivity: number;
  newsMentions: number;
  avgSentiment: number;
}

// 기존 하드코딩된 라이프사이클은 참고용으로만 남겨두고, 실제 분석은 MOCK_DAILY_DATA를 기반으로 합니다.
export const MOCK_LIFECYCLE: TechLifecycleDto[] = [
  { keyword: 'Agentic Workflow', status: 'RISING', peakDate: null, firstSeenDate: '2026-01-15', trendScore: 0, velocity: 0, weekOverWeek: 0, relatedKeywords: ['Agent', 'LLMTools'] },
  { keyword: 'RAG', status: 'PEAK', peakDate: '2026-02-20', firstSeenDate: '2025-06-10', trendScore: 0, velocity: 0, weekOverWeek: 0, relatedKeywords: ['VectorDB', 'Retrieval'] },
  { keyword: 'Vision Transformers', status: 'PEAK', peakDate: '2026-03-01', firstSeenDate: '2025-08-11', trendScore: 0, velocity: 0, weekOverWeek: 0, relatedKeywords: ['ViT', 'ComputerVision'] },
  { keyword: 'Mixture of Experts', status: 'RISING', peakDate: null, firstSeenDate: '2025-12-05', trendScore: 0, velocity: 0, weekOverWeek: 0, relatedKeywords: ['MoE', 'Scaling'] },
  { keyword: 'Fine-tuning', status: 'STABLE', peakDate: '2025-10-15', firstSeenDate: '2024-01-01', trendScore: 0, velocity: 0, weekOverWeek: 0, relatedKeywords: ['LoRA', 'PEFT'] },
  { keyword: 'Prompt Engineering', status: 'DECLINING', peakDate: '2025-05-10', firstSeenDate: '2023-11-01', trendScore: 0, velocity: 0, weekOverWeek: 0, relatedKeywords: ['In-context Learning'] },
];

const generateDaily14Days = (keyword: string, paperBase: number, githubBase: number, newsBase: number, sentimentBase: number, trendMultiplier: number): KeywordDailyRaw[] => {
  return Array.from({ length: 14 }).map((_, i) => {
    // 3월 3일부터 3월 16일까지 14일 생성
    const day = i + 3;
    const date = `2026-03-${String(day).padStart(2, '0')}`;
    
    // trendMultiplier에 따라 시간이 지날수록 점수가 오르거나 내리는 효과 부여
    const dayFactor = i * trendMultiplier; 
    
    // 렌더링 시마다 값이 바뀌는 Math.random() 대신, 
    // 동일한 날짜(i)에는 동일한 노이즈를 부여하는 Deterministic(결정론적) 계산식 적용
    const noise = Math.sin(i * 1.5) * 5; 
    
    return {
      keyword,
      date,
      paperMentions: Math.max(0, Math.floor(paperBase + dayFactor * 0.5 + noise)),
      githubActivity: Math.max(0, Math.floor(githubBase + dayFactor * 2 + noise * 2)),
      newsMentions: Math.max(0, Math.floor(newsBase + dayFactor * 1.5 + noise * 1.5)),
      avgSentiment: Math.min(100, Math.max(0, Math.floor(sentimentBase + (dayFactor > 0 ? 5 : -5) + noise))),
    };
  });
};

// 최근 14일 치 구체적 Raw Data 시뮬레이션
export const MOCK_DAILY_DATA: Record<string, KeywordDailyRaw[]> = {
  // 꾸준히 급상승 중
  'Agentic Workflow': generateDaily14Days('Agentic Workflow', 20, 50, 40, 80, 5),
  // 이미 포화 상태 (높은 수치 유지)
  'RAG': generateDaily14Days('RAG', 80, 200, 150, 85, 0),
  // 높은 수치에서 미세 상승
  'Vision Transformers': generateDaily14Days('Vision Transformers', 70, 180, 120, 80, 1),
  // 최근들어 트래픽 폭발
  'Mixture of Experts': generateDaily14Days('Mixture of Experts', 10, 30, 20, 75, 8),
  // 수치 하락세 (안정화)
  'Fine-tuning': generateDaily14Days('Fine-tuning', 50, 100, 80, 60, -2),
  // 지속적인 하락세
  'Prompt Engineering': generateDaily14Days('Prompt Engineering', 40, 80, 60, 50, -5),
};
