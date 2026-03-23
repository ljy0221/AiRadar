// components/features/profile/BookmarkList.tsx
'use client';

import { BookmarkItem } from '@/types/user';
import { ExternalLink, Bookmark, Clock } from 'lucide-react';

// Mock Data for UI demonstration
const mockBookmarks: BookmarkItem[] = [
  {
    id: 'news_001',
    type: 'news',
    title: 'OpenAI, 신규 추론 모델 o1 시리즈 공개',
    source: 'TechCrunch',
    category: 'LLM',
    occurredAt: '2026-03-22T10:00:00Z',
    url: 'https://openai.com'
  },
  {
    id: 'paper_001',
    type: 'paper',
    title: 'Attention Is All You Need',
    source: 'NeurIPS 2017',
    category: 'LLM',
    occurredAt: '2026-03-21T15:30:00Z',
    url: 'https://arxiv.org/abs/1706.03762'
  },
  {
    id: 'news_002',
    type: 'news',
    title: 'NVIDIA, 차세대 Blackwell GPU 수율 이슈 해결',
    source: 'The Verge',
    category: 'Semiconductor',
    occurredAt: '2026-03-20T09:15:00Z',
  }
];

export const BookmarkList = () => {
  // 실제 연동 시에는 useBookmarksQuery() 등을 통해 데이터를 가져옵니다.
  const bookmarks = mockBookmarks;

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  };

  return (
    <div className="bg-white dark:bg-gray-800/50 rounded-2xl p-8 shadow-sm border border-gray-100 dark:border-gray-700 mt-8">
      <div className="flex items-center gap-2 mb-6">
        <div className="p-2 bg-[var(--color-accent)]/10 rounded-lg">
          <Bookmark className="w-5 h-5 text-[var(--color-accent)]" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">북마크 보관함</h3>
          <p className="text-gray-400 text-xs mt-1">사용자가 저장한 뉴스 및 논문 목록입니다.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {bookmarks.map((item) => (
          <div 
            key={item.id}
            className="group flex flex-col md:flex-row md:items-center justify-between p-5 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl hover:border-[var(--color-accent)]/30 hover:shadow-md transition-all duration-300"
          >
            <div className="flex-1 min-w-0 pr-4">
              <div className="flex items-center gap-2 mb-2">
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md uppercase tracking-wider ${
                  item.type === 'news' 
                    ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' 
                    : 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'
                }`}>
                  {item.type === 'news' ? 'NEWS' : 'PAPER'}
                </span>
                <span className="text-[10px] font-medium text-gray-400">{item.source} · {item.category}</span>
              </div>
              <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 line-clamp-1 mb-2 group-hover:text-[var(--color-accent)] transition-colors">
                {item.title}
              </h4>
              <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                <Clock className="w-3 h-3" />
                <span>{formatDate(item.occurredAt)} 저장됨</span>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-4 md:mt-0">
              {item.url && (
                <a 
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 bg-white dark:bg-gray-800 text-gray-400 hover:text-[var(--color-accent)] border border-gray-100 dark:border-gray-700 rounded-lg shadow-sm transition-all"
                  title="원문 보기"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
              {/* 북마크 취소 버튼 등 추가 가능 */}
            </div>
          </div>
        ))}

        {bookmarks.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-sm text-gray-400">저장된 북마크가 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
};
