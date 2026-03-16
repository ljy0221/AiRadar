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
}

export interface DashboardResponse {
  metrics: MetricData[];
  keywords: KeywordTrend[];
  barData: { name: string; score: number; color: string }[];
  radarData: { subject: string; trendScore: number; growth: number; fullMark: number }[];
  keywordDictionary: KeywordDefinition[];
}

// --- Mock Data ---
const generateInterestData = (baseVol: number, baseMentions: number, baseSentiment: number) => {
  return Array.from({ length: 7 }).map((_, i) => ({
    date: `03. 0${i + 1}.`,
    mentionCount: baseMentions + Math.floor(Math.random() * 20),
    searchVol: baseVol + Math.floor(Math.random() * 10),
    sentimentScore: baseSentiment + Math.floor(Math.random() * 10) - 5,
  }));
};

const mockDashboardData: DashboardResponse = {
  metrics: [
    { title: "Agentic Workflow", value: "2", subtitle: "이번 주 떠오르는 기술", trend: 'up' },
    { title: "Prompt Engineering", value: "1", subtitle: "이번 주 사라지는 기술", trend: 'down' },
    { title: "평균 90.2점", value: "2", subtitle: "피크 상태 기술" },
    { title: "6개 카테고리", value: "6", subtitle: "추적 중인 키워드" },
  ],
  keywords: [
    { name: 'Agentic Workflow', status: '떠오르는 중', trendScore: 78.5, changeRate: 15.2, weeklyGrowth: 42.5 },
    { name: 'RAG', status: '최고조', trendScore: 92.1, changeRate: 2.4, weeklyGrowth: 5.1 },
    { name: 'Vision Transformers', status: '최고조', trendScore: 88.3, changeRate: 3.8, weeklyGrowth: 12.3 },
    { name: 'Mixture of Experts', status: '떠오르는 중', trendScore: 71.2, changeRate: 18.5, weeklyGrowth: 55.2 },
    { name: 'Fine-tuning', status: '안정기', trendScore: 65.5, changeRate: 5.1, weeklyGrowth: -8.4 },
    { name: 'Prompt Engineering', status: '하락세', trendScore: 52.3, changeRate: 12.3, weeklyGrowth: -18.7 },
  ],
  barData: [
    { name: 'Agentic Workflow', score: 78.5, color: '#10b981' },
    { name: 'RAG', score: 92.1, color: '#ef4444' },
    { name: 'Vision Transformers', score: 88.3, color: '#ef4444' },
    { name: 'Mixture of Experts', score: 71.2, color: '#10b981' },
    { name: 'Fine-tuning', score: 65.5, color: '#6b7280' },
    { name: 'Prompt Engineering', score: 52.3, color: '#eab308' },
  ],
  radarData: [
    { subject: 'Agentic Workflow', trendScore: 78, growth: 42, fullMark: 100 },
    { subject: 'RAG', trendScore: 92, growth: 5, fullMark: 100 },
    { subject: 'Vision Transformers', trendScore: 88, growth: 12, fullMark: 100 },
  ],
  keywordDictionary: [
    {
      id: 'kw-001',
      term: '에이전틱 워크플로우',
      englishTerm: 'Agentic Workflow',
      category: '개념/이론',
      summary: 'AI 에이전트가 목표를 스스로 달성하기 위해 계획, 실행, 반성하는 업무 흐름',
      description: '단순한 질의응답을 넘어 AI 모델이 하나의 자율적인 주체(Agent)로서 복잡한 과제를 여러 단계로 쪼개어 스스로 도구(웹 검색, 코드 실행 등)를 활용하고 피드백을 통해 결과물을 개선해 나가는 반복적인 프로세스입니다. Andrew Ng은 프롬프트 개선보다 Agentic 구조가 더 높은 성능을 낼 수 있다고 강조했습니다.'
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
      id: 'kw-003',
      term: '거대 언어 모델',
      englishTerm: 'LLM (Large Language Model)',
      category: '모델/아키텍처',
      summary: '수백억 개 이상의 매개변수로 방대한 텍스트 데이터를 학습해 자연어를 이해하고 생성하는 AI 모델',
      description: 'Transformer 아키텍처를 기반으로 방대한 텍스트 데이터셋을 사전 학습(Pre-training)하여 인간처럼 자연스러운 텍스트를 이해, 요약, 번역, 생성할 수 있는 인공지능 모델입니다. GPT-4, Claude 3, Llama 3 등이 대표적입니다.'
    },
    {
      id: 'kw-004',
      term: '전문가 혼합 모델',
      englishTerm: 'MoE (Mixture of Experts)',
      category: '모델/아키텍처',
      summary: '여러 개의 작은 전문가(Expert) 모델을 묶어 연산은 효율적으로 하면서 성능은 높이는 아키텍처',
      description: '방대한 파라미터 전부를 사용하지 않고, 입력된 데이터(질문)의 특성에 따라 그에 맞는 소수의 전문가 신경망 네트워크만 활성화시키는 병렬 처리 구조입니다. 더 큰 규모로 확장 가능하면서도 추론 비용과 시간을 획기적으로 낮출 수 있습니다.'
    },
    {
      id: 'kw-005',
      term: '멀티모달 AI',
      englishTerm: 'Multimodal AI',
      category: '개념/이론',
      summary: '텍스트, 이미지, 음성, 영상 등 다양한 형태의 데이터를 동시에 이해하고 처리하는 인공지능',
      description: '기존의 단일 모달(예: 텍스트만 처리)에서 벗어나, 사람이 세상을 시각과 청각, 언어로 동시에 인식하듯이 사진을 보고 질문에 답하거나 소리를 듣고 이미지를 생성해내는 능력을 갖춘 최신 AI 시스템을 지칭합니다. GPT-4o나 Gemini가 대표적입니다.'
    },
    {
      id: 'kw-006',
      term: '프롬프트 엔지니어링',
      englishTerm: 'Prompt Engineering',
      category: '학습/기법',
      summary: 'AI 모델로부터 최적의 결과물을 이끌어내기 위해 질문(입력값)을 설계하고 최적화하는 기술',
      description: '언어 모델이 주어진 과제를 정확하게 수행하도록 문맥 부여, 페르소나 설정, 단계별 사고(Chain of Thought) 유도 등 다양하고 정교한 지시어를 조합해 원하는 출력물을 효과적으로 제어하는 방법론입니다.'
    }
  ]
};

// --- Mock API Fetcher ---
// 실제 백엔드 연동 전까지 네트워크 딜레이를 흉내내는 Mock API입니다.
// 나중에는 return api.get('/dashboard') 형식으로 교체합니다.
export const fetchDashboardData = async (): Promise<DashboardResponse> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(mockDashboardData);
    }, 800); // 0.8초 딜레이
  });
};
