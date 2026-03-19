import { BookOpen, Users, FileText } from 'lucide-react';
import { usePaperListQuery } from '@/hooks/queries/usePaperQuery';

const CATEGORY_COLOR: Record<string, string> = {
  LLM:        'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
  Agent:      'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
  Vision:     'bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400',
  Multimodal: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
  Efficient:  'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
  RL:         'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

export const PaperListCard = () => {
  const { data: papers, isLoading, isError } = usePaperListQuery();

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-[#1a1c2e] p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm animate-pulse h-64" />
    );
  }

  if (isError || !papers) {
    return (
      <div className="bg-white dark:bg-[#1a1c2e] p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex items-center justify-center h-32">
        <p className="text-sm text-red-500">논문 데이터를 불러오는 데 실패했습니다.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#1a1c2e] p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-500" />
          <h2 className="text-xl font-bold">최신 Arxiv 논문</h2>
        </div>
        <span className="text-xs text-gray-400 dark:text-gray-500">발행일 최신순</span>
      </div>

      <div className="flex flex-col divide-y divide-gray-100 dark:divide-gray-800">
        {papers.slice(0, 5).map((paper) => (
          <div key={paper.paperId} className="py-3 first:pt-0 last:pb-0">
            <div className="flex items-start gap-2 mb-1">
              {/* 카테고리 뱃지 */}
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${CATEGORY_COLOR[paper.category] ?? 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>
                {paper.category}
              </span>
            </div>
            {/* 제목 */}
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-snug mb-1.5 line-clamp-2">
              {paper.title}
            </p>
            {/* 저자 & 날짜 */}
            <div className="flex items-center gap-3 text-xs text-gray-400">
              <span className="flex items-center gap-1 truncate">
                <Users className="w-3 h-3 shrink-0" />
                {paper.authors.slice(0, 2).join(', ')}{paper.authors.length > 2 ? ' 외' : ''}
              </span>
              <span className="flex items-center gap-1 shrink-0">
                <BookOpen className="w-3 h-3" />
                {formatDate(paper.publishedAt)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
