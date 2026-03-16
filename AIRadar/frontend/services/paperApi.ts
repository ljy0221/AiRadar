// services/paperApi.ts
// Arxiv 논문 데이터 API 서비스
// 현재: Mock 데이터 반환 / 실제 백엔드 연동 시 TODO 주석 확인 후 교체

import type { PaperDetail, PaperListItem, PaperListParams } from '@/types/paper';

// ─────────────────────────────────────────────────────────────
// Mock Data — 백엔드 연동 전까지 사용
// ─────────────────────────────────────────────────────────────
const MOCK_PAPER_LIST: PaperListItem[] = [
  {
    paperId: '2403.09611',
    title: 'Mixtral of Experts: Scaling Sparse Architectures for Efficient LLM Inference',
    source: 'arxiv',
    authors: ['Albert Q. Jiang', 'Alexandre Sablayrolles', 'Antoine Roux'],
    researchArea: 'Large Language Models',
    category: 'LLM',
    publishedAt: '2026-03-14T09:22:00',
  },
  {
    paperId: '2403.10341',
    title: 'ReAct: Synergizing Reasoning and Acting in Language Models',
    source: 'arxiv',
    authors: ['Shunyu Yao', 'Jeffrey Zhao', 'Dian Yu'],
    researchArea: 'AI Agents',
    category: 'Agent',
    publishedAt: '2026-03-13T14:05:00',
  },
  {
    paperId: '2403.11281',
    title: 'LLaVA-NeXT: Improved Reasoning, OCR, and World Knowledge with LLaVA-1.6',
    source: 'arxiv',
    authors: ['Haotian Liu', 'Chunyuan Li', 'Yuheng Li'],
    researchArea: 'Multimodal AI',
    category: 'Multimodal',
    publishedAt: '2026-03-13T10:30:00',
  },
  {
    paperId: '2403.08295',
    title: 'Quiet-STaR: Language Models Can Teach Themselves to Think Before Speaking',
    source: 'arxiv',
    authors: ['Eric Zelikman', 'Georges Harik', 'Yijia Shao'],
    researchArea: 'AI Agents',
    category: 'Agent',
    publishedAt: '2026-03-12T11:00:00',
  },
  {
    paperId: '2403.07918',
    title: 'EfficientViM: Efficient Vision Mamba with Hidden State Mixer',
    source: 'arxiv',
    authors: ['Yue Liu', 'Yunjie Tian', 'Yuzhong Zhao'],
    researchArea: 'Computer Vision',
    category: 'Vision',
    publishedAt: '2026-03-12T08:00:00',
  },
  {
    paperId: '2403.06511',
    title: 'GemmaScope: Open Sparse Autoencoders Everywhere All At Once',
    source: 'arxiv',
    authors: ['Tom Lieberum', 'Senthooran Rajamanoharan', 'Arthur Conmy'],
    researchArea: 'Large Language Models',
    category: 'LLM',
    publishedAt: '2026-03-11T16:45:00',
  },
  {
    paperId: '2403.05821',
    title: 'MiniCPM-V: A GPT-4V Level MLLM on Your Phone',
    source: 'arxiv',
    authors: ['Yuan Yao', 'Tianyu Yu', 'Ao Zhang'],
    researchArea: 'Efficient AI / Edge AI',
    category: 'Efficient',
    publishedAt: '2026-03-10T09:30:00',
  },
  {
    paperId: '2403.04652',
    title: 'RLVR: Reinforcement Learning with Verifiable Rewards for LLM Reasoning',
    source: 'arxiv',
    authors: ['Zhenghao Lin', 'Zhibin Gou', 'Fanqi Wan'],
    researchArea: 'Reinforcement Learning',
    category: 'RL',
    publishedAt: '2026-03-09T13:20:00',
  },
];

const MOCK_PAPER_DETAIL: Record<string, PaperDetail> = {
  '2403.09611': {
    paperId: '2403.09611',
    title: 'Mixtral of Experts: Scaling Sparse Architectures for Efficient LLM Inference',
    abstractText:
      'We introduce Mixtral 8x7B, a Sparse Mixture of Experts (SMoE) language model. Mixtral has the same architecture as Mistral 7B, with the difference that each layer is composed of 8 feedforward blocks (i.e., experts). At every layer, for every token, a router network selects two experts to process the current state and combine their outputs. This process is efficient because, although each token interacts with two experts, the model routes each token to only a subset of the total network parameters.',
    url: 'https://arxiv.org/abs/2403.09611',
    source: 'arxiv',
    authors: ['Albert Q. Jiang', 'Alexandre Sablayrolles', 'Antoine Roux'],
    researchArea: 'Large Language Models',
    keywords: ['sparse mixture of experts', 'LLM', 'inference efficiency', 'transformer', 'MoE'],
    summary:
      'Mixtral 8x7B는 스파스 전문가 혼합(SMoE) 방식을 채택해 추론 효율을 높이면서 성능을 유지하는 LLM 아키텍처입니다. 레이어마다 8개의 전문가 중 2개를 선택해 처리합니다.',
    category: 'LLM',
    publishedAt: '2026-03-14T09:22:00',
  },
  '2403.10341': {
    paperId: '2403.10341',
    title: 'ReAct: Synergizing Reasoning and Acting in Language Models',
    abstractText:
      'While large language models (LLMs) have demonstrated impressive capabilities across tasks in language understanding and interactive decision making, their abilities for reasoning and acting have primarily been studied as separate topics. In this paper, we explore the use of LLMs to generate both reasoning traces and task-specific actions in an interleaved manner.',
    url: 'https://arxiv.org/abs/2403.10341',
    source: 'arxiv',
    authors: ['Shunyu Yao', 'Jeffrey Zhao', 'Dian Yu'],
    researchArea: 'AI Agents',
    keywords: ['reasoning', 'acting', 'LLM', 'agent', 'chain-of-thought'],
    summary:
      'ReAct는 LLM이 추론(Reasoning)과 행동(Acting)을 교차하여 생성함으로써 더 신뢰성 높은 AI 에이전트를 구현하는 프레임워크입니다.',
    category: 'Agent',
    publishedAt: '2026-03-13T14:05:00',
  },
};

// ─────────────────────────────────────────────────────────────
// API Functions
// ─────────────────────────────────────────────────────────────

// TODO: replace with real API → api.get('/papers', { params })
export const fetchPaperList = async (params?: PaperListParams): Promise<PaperListItem[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      let result = [...MOCK_PAPER_LIST];
      if (params?.category) result = result.filter((p) => p.category === params.category);
      if (params?.researchArea) result = result.filter((p) => p.researchArea === params.researchArea);
      resolve(result);
    }, 600);
  });
};

// TODO: replace with real API → api.get(`/papers/${paperId}`)
export const fetchPaperDetail = async (paperId: string): Promise<PaperDetail | null> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(MOCK_PAPER_DETAIL[paperId] ?? null);
    }, 400);
  });
};
