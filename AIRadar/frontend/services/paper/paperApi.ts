// services/paperApi.ts
// Arxiv 논문 데이터 API 서비스
// 현재: Mock 데이터 반환 / 실제 백엔드 연동 시 TODO 주석 확인 후 교체

import type { PaperDetail, PaperListItem, PaperListParams } from '@/types/paper';

import { MOCK_PAPER_LIST, MOCK_PAPER_DETAIL } from './paperRaw';

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
