// services/newsApi.ts
// 뉴스 데이터 API 서비스
// 현재: Mock 데이터 반환 / 실제 백엔드 연동 시 TODO 주석 확인 후 교체

import type { NewsDetail, NewsListItem, NewsListParams } from '@/types/news';

// ─────────────────────────────────────────────────────────────
// Mock Data — 백엔드 연동 전까지 사용
// ─────────────────────────────────────────────────────────────
const MOCK_NEWS_LIST: NewsListItem[] = [
  {
    articleId: 'news-20260315-001',
    title: 'OpenAI, GPT-5 출시 임박… 추론 능력 GPT-4o 대비 3배 향상',
    source: 'TechCrunch',
    region: 'GLOBAL',
    category: 'AI_MODEL',
    sentiment: 'POSITIVE',
    score: 0.8732,
    publishedAt: '2026-03-15T08:30:00',
  },
  {
    articleId: 'news-20260315-002',
    title: '삼성전자, AI 반도체 HBM4 양산 돌입… NVIDIA 공급망 강화',
    source: '연합뉴스',
    region: 'DOMESTIC',
    category: 'AI_HARDWARE',
    sentiment: 'POSITIVE',
    score: 0.7415,
    publishedAt: '2026-03-15T10:11:00',
  },
  {
    articleId: 'news-20260315-003',
    title: 'EU AI Act 본격 시행… 고위험 AI 시스템 규제 강화',
    source: 'Reuters',
    region: 'GLOBAL',
    category: 'AI_POLICY',
    sentiment: 'NEGATIVE',
    score: 0.3102,
    publishedAt: '2026-03-15T06:45:00',
  },
  {
    articleId: 'news-20260314-001',
    title: '네이버, 하이퍼클로바X 2.0 공개… 한국어 특화 멀티모달 지원',
    source: '매일경제',
    region: 'DOMESTIC',
    category: 'AI_MODEL',
    sentiment: 'POSITIVE',
    score: 0.8241,
    publishedAt: '2026-03-14T11:20:00',
  },
  {
    articleId: 'news-20260314-002',
    title: 'Anthropic, Claude 4 출시… 코딩·수학 추론 벤치마크 1위',
    source: 'The Verge',
    region: 'GLOBAL',
    category: 'AI_MODEL',
    sentiment: 'POSITIVE',
    score: 0.9102,
    publishedAt: '2026-03-14T09:00:00',
  },
  {
    articleId: 'news-20260313-001',
    title: 'Google DeepMind, 단백질 구조 예측 모델 AlphaFold 3 논문 공개',
    source: 'Nature',
    region: 'GLOBAL',
    category: 'AI_RESEARCH',
    sentiment: 'POSITIVE',
    score: 0.8870,
    publishedAt: '2026-03-13T15:30:00',
  },
  {
    articleId: 'news-20260313-002',
    title: '국내 AI 스타트업 투자 위축… VC 시장 양극화 심화',
    source: '한국경제',
    region: 'DOMESTIC',
    category: 'AI_BUSINESS',
    sentiment: 'NEGATIVE',
    score: 0.2450,
    publishedAt: '2026-03-13T14:00:00',
  },
  {
    articleId: 'news-20260312-001',
    title: 'Microsoft, Azure AI 서비스 가격 30% 인하… 기업 고객 유치 공세',
    source: 'Bloomberg',
    region: 'GLOBAL',
    category: 'AI_BUSINESS',
    sentiment: 'NEUTRAL',
    score: 0.5312,
    publishedAt: '2026-03-12T08:00:00',
  },
];

const MOCK_NEWS_DETAIL: Record<string, NewsDetail> = {
  'news-20260315-001': {
    articleId: 'news-20260315-001',
    title: 'OpenAI, GPT-5 출시 임박… 추론 능력 GPT-4o 대비 3배 향상',
    content:
      'OpenAI가 오는 4월 차세대 모델 GPT-5를 공개할 예정이라고 밝혔다. 내부 벤치마크에 따르면 GPT-5는 MATH, GPQA 등 추론 집약적 과제에서 GPT-4o 대비 약 3배의 성능 향상을 보였다. 특히 멀티모달 능력이 크게 개선되어 이미지·오디오를 포함한 복합 입력에 대한 이해력이 향상됐다. OpenAI CEO 샘 알트만은 "GPT-5는 우리가 만든 모델 중 가장 뛰어나며, AI 에이전트 활용을 크게 가속화할 것"이라고 말했다.',
    url: 'https://techcrunch.com/2026/03/15/openai-gpt5-release',
    source: 'TechCrunch',
    countryCode: 'US',
    region: 'GLOBAL',
    category: 'AI_MODEL',
    sentiment: 'POSITIVE',
    keywords: ['OpenAI', 'GPT-5', 'LLM', '추론', 'AI 에이전트'],
    score: 0.8732,
    summary: 'OpenAI가 GPT-5를 4월 출시 예정이며, 추론 성능이 GPT-4o 대비 3배 향상됐다고 발표했습니다.',
    viewCount: 14230,
    publishedAt: '2026-03-15T08:30:00',
  },
  'news-20260315-002': {
    articleId: 'news-20260315-002',
    title: '삼성전자, AI 반도체 HBM4 양산 돌입… NVIDIA 공급망 강화',
    content:
      '삼성전자가 차세대 고대역폭 메모리 HBM4 양산에 본격 돌입했다. HBM4는 HBM3E 대비 데이터 전송 속도가 약 50% 향상됐으며, AI 훈련·추론 워크로드에 최적화 설계됐다. NVIDIA와의 공급 계약이 확대됨에 따라 삼성의 AI 반도체 사업 매출 비중이 올해 35%를 넘어설 것으로 전망된다.',
    url: 'https://news.naver.com/tech/samsung-hbm4-2026',
    source: '연합뉴스',
    countryCode: 'KR',
    region: 'DOMESTIC',
    category: 'AI_HARDWARE',
    sentiment: 'POSITIVE',
    keywords: ['삼성전자', 'HBM4', 'NVIDIA', 'AI 반도체', '메모리'],
    score: 0.7415,
    summary: '삼성전자가 HBM4 양산을 시작하며 NVIDIA 공급망을 강화합니다.',
    viewCount: 8910,
    publishedAt: '2026-03-15T10:11:00',
  },
  'news-20260315-003': {
    articleId: 'news-20260315-003',
    title: 'EU AI Act 본격 시행… 고위험 AI 시스템 규제 강화',
    content:
      'EU AI Act(인공지능법)가 본격 시행되면서 고위험 AI 시스템을 운영하는 기업들은 투명성 요건 준수가 의무화됐다. 의료·교육·채용·법집행 등 고위험 카테고리에 해당하는 AI 시스템은 적합성 평가를 받아야 하며, 위반 시 전 세계 연간 매출의 최대 6%에 달하는 과징금이 부과된다.',
    url: 'https://reuters.com/tech/eu-ai-act-enforcement-2026',
    source: 'Reuters',
    countryCode: 'GB',
    region: 'GLOBAL',
    category: 'AI_POLICY',
    sentiment: 'NEGATIVE',
    keywords: ['EU', 'AI Act', '규제', '고위험 AI', '컴플라이언스'],
    score: 0.3102,
    summary: 'EU AI Act 시행으로 고위험 AI 기업에 대한 규제와 과징금이 강화됩니다.',
    viewCount: 5670,
    publishedAt: '2026-03-15T06:45:00',
  },
};

// ─────────────────────────────────────────────────────────────
// API Functions
// ─────────────────────────────────────────────────────────────

// TODO: replace with real API → api.get('/news', { params })
export const fetchNewsList = async (params?: NewsListParams): Promise<NewsListItem[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      let result = [...MOCK_NEWS_LIST];
      if (params?.region) result = result.filter((n) => n.region === params.region);
      if (params?.category) result = result.filter((n) => n.category === params.category);
      resolve(result);
    }, 600);
  });
};

// TODO: replace with real API → api.get(`/news/${articleId}`)
export const fetchNewsDetail = async (articleId: string): Promise<NewsDetail | null> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(MOCK_NEWS_DETAIL[articleId] ?? null);
    }, 400);
  });
};
