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

export interface TechKeywordDailyDto {
  keyword: string;
  statDate: string;
  sourceType: string;
  mentionCount: number;
  searchCount: number; // 명세엔 있으나 실제 크롤링 안함 (0 처리)
  avgSentiment: number;
  commitCount: number; // GHA 기반 환산 점수 사용 영역
}

export const MOCK_LIFECYCLE: TechLifecycleDto[] = [
  {
    keyword: 'Agentic Workflow',
    status: 'RISING',
    peakDate: null,
    firstSeenDate: '2026-01-15',
    trendScore: 78.5,
    velocity: 15.2,
    weekOverWeek: 42.5,
    relatedKeywords: ['Agent', 'LLMTools'],
  },
  {
    keyword: 'RAG',
    status: 'PEAK',
    peakDate: '2026-02-20',
    firstSeenDate: '2025-06-10',
    trendScore: 92.1,
    velocity: 2.4,
    weekOverWeek: 5.1,
    relatedKeywords: ['VectorDB', 'Retrieval'],
  },
  {
    keyword: 'Vision Transformers',
    status: 'PEAK',
    peakDate: '2026-03-01',
    firstSeenDate: '2025-08-11',
    trendScore: 88.3,
    velocity: 3.8,
    weekOverWeek: 12.3,
    relatedKeywords: ['ViT', 'ComputerVision'],
  },
  {
    keyword: 'Mixture of Experts',
    status: 'RISING',
    peakDate: null,
    firstSeenDate: '2025-12-05',
    trendScore: 71.2,
    velocity: 18.5,
    weekOverWeek: 55.2,
    relatedKeywords: ['MoE', 'Scaling'],
  },
  {
    keyword: 'Fine-tuning',
    status: 'STABLE',
    peakDate: '2025-10-15',
    firstSeenDate: '2024-01-01',
    trendScore: 65.5,
    velocity: 0.5,
    weekOverWeek: -8.4,
    relatedKeywords: ['LoRA', 'PEFT'],
  },
  {
    keyword: 'Prompt Engineering',
    status: 'DECLINING',
    peakDate: '2025-05-10',
    firstSeenDate: '2023-11-01',
    trendScore: 52.3,
    velocity: -12.3,
    weekOverWeek: -18.7,
    relatedKeywords: ['In-context Learning'],
  },
];

const generateDaily = (keyword: string, baseMentions: number, baseSentiment: number, baseCommit: number): TechKeywordDailyDto[] => {
  return Array.from({ length: 7 }).map((_, i) => {
    // 3월 10일부터 16일까지 7일
    const date = `2026-03-${String(i + 10).padStart(2, '0')}`;
    return {
      keyword,
      statDate: date,
      sourceType: 'ALL',
      mentionCount: baseMentions + Math.floor(Math.random() * 20),
      searchCount: 0, 
      avgSentiment: baseSentiment + Math.floor(Math.random() * 10) - 5,
      commitCount: baseCommit + Math.floor(Math.random() * 50),
    };
  });
};

export const MOCK_DAILY_DATA: Record<string, TechKeywordDailyDto[]> = {
  'Agentic Workflow': generateDaily('Agentic Workflow', 40, 75, 120),
  'RAG': generateDaily('RAG', 80, 85, 200),
  'Vision Transformers': generateDaily('Vision Transformers', 60, 80, 150),
  'Mixture of Experts': generateDaily('Mixture of Experts', 30, 65, 80),
  'Fine-tuning': generateDaily('Fine-tuning', 20, 60, 50),
  'Prompt Engineering': generateDaily('Prompt Engineering', 10, 50, 20),
};
