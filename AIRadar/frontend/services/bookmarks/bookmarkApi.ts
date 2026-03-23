// services/bookmarks/bookmarkApi.ts
import { api } from '../common/api';

export const bookmarkApi = {
  // 뉴스 북마크 추가
  addNewsBookmark: (articleId: string) => 
    api.post(`/news/${articleId}/bookmark`),

  // 뉴스 북마크 삭제
  removeNewsBookmark: (articleId: string) => 
    api.delete(`/news/${articleId}/bookmark`),

  // 논문 북마크 추가
  addPaperBookmark: (paperId: string) => 
    api.post(`/papers/${paperId}/bookmark`),

  // 논문 북마크 삭제
  removePaperBookmark: (paperId: string) => 
    api.delete(`/papers/${paperId}/bookmark`),
};
