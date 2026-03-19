// import { api } from './api';

// --- Type Definitions ---
export interface MetricData {
  title: string;
  value: string | number;
  subtitle: string;
  trend?: 'up' | 'down' | 'neutral';
  // icon 필드는 컴포넌트 레벨에서 매핑하는 것이 좋습니다 (DTO 역할)
}

export interface KeywordTrend {
  name: string;
  status: '떠오르는 중' | '최고조' | '안정기' | '하락세';
  trendScore: number;
  changeRate: number;
  weeklyGrowth: number;
  description?: string;
  details?: KeywordDefinition['details'];
}

export interface ChartData {
  date: string;
  mentionCount: number;
  searchVol: number;
  sentimentScore: number;
}

export interface KeywordDefinition {
  id: string;
  term: string;
  englishTerm: string;
  category: '개념/이론' | '모델/아키텍처' | '학습/기법' | '기타';
  summary: string;
  description: string;
  // 모델 상세 정보 (선택항목)
  details?: {
    developer?: string;
    launchDate?: string;
    parameters?: string;
    contextWindow?: string;
    strengths?: string[];
  };
}

export interface ModelPerformance {
  modelName: string;
  category: string;
  benchmarks: {
    name: string;
    score: number;
    fullMark: number;
  }[];
}

export interface RankingItem {
  rank: number;
  keyword: string;
  change: number | 'new'; // 순위 변동 (양수: 상승, 음수: 하락, 0: 유지, 'new': 신규 진입)
  score?: number;
}

export interface DashboardResponse {
  metrics: MetricData[];
  keywords: KeywordTrend[];
  barData: { name: string; score: number; color: string }[];
  radarData: { subject: string; trendScore: number; growth: number; fullMark: number }[];
  keywordDictionary: KeywordDefinition[];
  modelComparison: ModelPerformance[];
  interestData: Record<string, ChartData[]>;
  rankingData: RankingItem[];
  popularSearches: RankingItem[];
}

const mockKeywordDictionary: KeywordDefinition[] = [
  {
    id: 'kw-001',
    term: '에이전틱 워크플로우',
    englishTerm: 'Agentic Workflow',
    category: '개념/이론',
    summary: 'AI 에이전트가 목표를 스스로 달성하기 위해 계획, 실행, 반성하는 업무 흐름',
    description: '단순한 질의응답을 넘어 AI 모델이 하나의 자율적인 주체(Agent)로서 복잡한 과제를 여러 단계로 쪼개어 스스로 도구(웹 검색, 코드 실행 등)를 활용하고 피드백을 통해 결과물을 개선해 나가는 반복적인 프로세스입니다. Andrew Ng은 프롬프트 개선보다 Agentic 구조가 더 높은 성능을 낼 수 있다고 강조했습니다.'
  },
  {
    id: 'kw-003',
    term: 'GPT-4o',
    englishTerm: 'Generative Pre-trained Transformer 4 Omni',
    category: '모델/아키텍처',
    summary: 'OpenAI의 최신 멀티모달 LLM으로 텍스트, 음성, 이미지를 실시간으로 처리',
    description: 'GPT-4의 성능을 유지하면서 추론 속도를 획기적으로 개선한 옴니(Omni) 모델입니다. 인간과 유사한 응답 속도로 대화가 가능하며, 복잡한 논리 추론과 창의적 글쓰기에서 최고 수준의 성능을 보여줍니다.',
    details: {
      developer: 'OpenAI',
      launchDate: '2024.05',
      parameters: '비공개 (추정 1.8T)',
      contextWindow: '128k tokens',
      strengths: ['멀티모달 통합', '빠른 응답 속도', '복잡한 추론']
    }
  },
  {
    id: 'kw-007',
    term: 'Claude 3.5 Sonnet',
    englishTerm: 'Claude 3.5 Sonnet',
    category: '모델/아키텍처',
    summary: 'Anthropic의 고성능 모델로 뛰어난 코딩 능력과 시각적 이해력 보유',
    description: '지능 지수, 코딩 능력, 시각적 이해력 등 대부분의 벤치마크에서 기존 최고 성능 모델들을 압도하는 성능을 보여줍니다. 특히 인간에 가까운 자연스러운 문체와 정교한 지시 이행 능력이 특징입니다.',
    details: {
      developer: 'Anthropic',
      launchDate: '2024.06',
      parameters: '비공개',
      contextWindow: '200k tokens',
      strengths: ['코딩 능력', '자연스러운 문체', '시각 분석']
    }
  },
  {
    id: 'kw-004',
    term: 'Llama 3.1 405B',
    englishTerm: 'Large Language Model Meta AI 3.1',
    category: '모델/아키텍처',
    summary: 'Meta에서 공개한 세계 최대 규모의 오픈 소스 LLM',
    description: '오픈 소스 모델 최초로 GPT-4o와 대등한 지능 수준을 달성했습니다. 방대한 지식 기반과 뛰어난 다국어 처리 능력을 갖추고 있으며, 기업들이 인프라를 직접 구축하여 커스터마이징하기에 최적화되어 있습니다.',
    details: {
      developer: 'Meta',
      launchDate: '2024.07',
      parameters: '405B',
      contextWindow: '128k tokens',
      strengths: ['오픈 소스 생태계', '지식 추출', '파인튜닝 용이']
    }
  },
  {
    id: 'kw-002',
    term: '검색 증강 생성',
    englishTerm: 'RAG (Retrieval-Augmented Generation)',
    category: '학습/기법',
    summary: '외부 지식 베이스를 검색해 언어 모델의 답변 생성 과정을 돕는 방법',
    description: '거대 언어 모델(LLM)이 가진 할각(Hallucination) 현상을 줄이고 최신 정보나 기업 내부의 기밀 데이터를 바탕으로 정확한 사실 기반의 답변을 하도록 만드는 기술입니다. 답변 전 관련된 문서들을 먼저 검색(Retrieval)하여 맥락으로 주입한 뒤 세대를 진행(Generation)합니다.'
  },
  {
    id: 'kw-005',
    term: '멀티모달 AI',
    englishTerm: 'Multimodal AI',
    category: '개념/이론',
    summary: '텍스트, 이미지, 음성, 영상 등 다양한 형태의 데이터를 동시에 이해하고 처리하는 인공지능',
    description: '기존의 단일 모달(예: 텍스트만 처리)에서 벗어나, 사람이 세상을 시각과 청각, 언어로 동시에 인식하듯이 사진을 보고 질문에 답하거나 소리를 듣고 이미지를 생성해내는 능력을 갖춘 최신 AI 시스템을 지칭합니다. GPT-4o나 Gemini가 대표적입니다.'
  }
];

import { analyzeDashboardData } from '@/lib/analyzers/dashboardAnalyzer';

// --- Mock API Fetcher ---
// 실제 백엔드 연동 전까지 네트워크 딜레이를 흉내내는 Mock API입니다.
// 나중에는 return api.get('/dashboard') 형식으로 교체합니다.
export const fetchDashboardData = async (): Promise<DashboardResponse> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(analyzeDashboardData(mockKeywordDictionary));
    }, 800); // 0.8초 딜레이
  });
};
