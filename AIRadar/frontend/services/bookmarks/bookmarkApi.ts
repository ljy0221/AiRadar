// services/bookmarks/bookmarkApi.ts
import { api } from '../common/api';

export const bookmarkApi = {
  // 북마크 추가 (뉴스/논문 공용)
  addBookmark: (id: string) => 
    api.post('/events/article-bookmark', { articleId: id }),

  // 뉴스 북마크 추가 (레거시 지원을 위한 래퍼)
  addNewsBookmark: (articleId: string) => 
    bookmarkApi.addBookmark(articleId),

  // 논문 북마크 추가 (레거시 지원을 위한 래퍼)
  addPaperBookmark: (paperId: string) => 
    bookmarkApi.addBookmark(paperId),

  // 북마크 삭제 (공용)
  removeBookmark: (id: string) => 
    api.delete(`/users/me/bookmarks/${id}`),

  // 뉴스 북마크 삭제 (레거시 지원)
  removeNewsBookmark: (articleId: string) => 
    bookmarkApi.removeBookmark(articleId),

  // 논문 북마크 삭제 (레거시 지원)
  removePaperBookmark: (paperId: string) => 
    bookmarkApi.removeBookmark(paperId),
};
