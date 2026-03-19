// services/newsApi.ts
// 뉴스 데이터 API 서비스
// Mock API 엔드포인트 연동: GET /api/v1/mock/news?limit=10

import { api } from '../common/api';
import type { NewsDetail, NewsListItem, NewsListParams } from '@/types/news';

// ─────────────────────────────────────────────────────────────
// MockMixedItemDto (백엔드 응답 형태)
// ─────────────────────────────────────────────────────────────
interface MockMixedItemDto {
  type: 'news';
  id: string;          // news_items.article_id
  title: string;
  summary: string;
  category: string;
  source: string;
  url: string;
  publishedAt: string; // news_items.published_at
}

// MockMixedItemDto → NewsListItem 매핑
function toNewsListItem(dto: MockMixedItemDto): NewsListItem {
  return {
    articleId: dto.id,
    title: dto.title,
    source: dto.source,
    region: 'GLOBAL', // mock API에 region 정보 없음 → 기본값
    category: mapCategory(dto.category),
    sentiment: 'NEUTRAL',
    score: 0.5,
    publishedAt: dto.publishedAt,
    summary: dto.summary,
    url: dto.url,
  };
}

function mapCategory(cat: string): NewsListItem['category'] {
  const validCategories = ['LLM', 'Vision', 'Semiconductor', 'ETC'];
  if (!validCategories.includes(cat)) {
    console.warn('[newsApi] 알 수 없는 category 값:', cat, '→ 원본 그대로 사용');
  }
  return cat as NewsListItem['category'];
}


// ─────────────────────────────────────────────────────────────
// API Functions
// ─────────────────────────────────────────────────────────────

// GET /api/v1/mock/news?limit=10
export const fetchNewsList = async (params?: NewsListParams): Promise<NewsListItem[]> => {
  const limit = params?.size ?? 10;
  const response = await api.get<MockMixedItemDto[]>('/mock/news', {
    params: { limit },
  });

  // api 인터셉터가 response.data를 반환하므로 response 자체가 배열
  const raw = response as unknown as MockMixedItemDto[];

  // 실제 API 응답 category 값 확인용 (개발 환경에서만)
  if (process.env.NODE_ENV === 'development') {
    const categories = [...new Set(raw.map((i) => i.category))];
    console.log('[newsApi] 실제 category 값 목록:', categories);
  }

  const items = raw.filter((i) => i.type === 'news');

  let result = items.map(toNewsListItem);
  if (params?.region) result = result.filter((n) => n.region === params.region);
  if (params?.category) result = result.filter((n) => n.category === params.category);
  return result;
};

