// types/paper.ts
// Arxiv 논문(Paper) 관련 TypeScript 타입 정의
// 백엔드 PaperDto.ListItem / PaperDto.Detail 기반

export interface PaperListItem {
  paperId: string;      // Arxiv ID 형식: YYMM.NNNNN (예: '2403.09611')
  title: string;
  source: string;       // 항상 'arxiv'
  authors: string[];
  researchArea: string;
  category: PaperCategory;
  publishedAt: string;  // ISO 8601
}

export interface PaperDetail extends PaperListItem {
  abstractText: string;
  url: string;          // 'https://arxiv.org/abs/{paperId}'
  keywords: string[];
  summary: string;
}

export type PaperCategory =
  | 'LLM'
  | 'Agent'
  | 'Vision'
  | 'Multimodal'
  | 'Efficient'
  | 'RL'
  | 'NLP'
  | 'Other';

export interface PaperListParams {
  category?: PaperCategory;
  researchArea?: string;
  page?: number;
  size?: number;
}
