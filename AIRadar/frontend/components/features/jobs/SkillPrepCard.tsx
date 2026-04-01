import { Check } from 'lucide-react';

interface SkillPrepCardProps {
  uniqueSkills: string[];
  recommendedSkills: string[];
  tools: string[];
}

export const SkillPrepCard = ({ uniqueSkills, recommendedSkills, tools }: SkillPrepCardProps) => {
  return (
    <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-8 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-[#1a1c2e] md:p-8 lg:h-full lg:min-h-0">
      <h3 className="text-xl font-bold">차별화 스킬 & 대비 방안</h3>

      <div className="flex flex-col gap-3">
        <h4 className="text-sm font-bold text-gray-500 dark:text-gray-400">인간의 고유 영역</h4>
        <ul className="flex flex-col gap-2">
          {uniqueSkills.map((skill, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span className="text-[var(--color-accent)] font-bold mt-1 text-xs">●</span>
              <span className="font-medium">{skill}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-3">
        <h4 className="text-sm font-bold text-gray-500 dark:text-gray-400">추천 역량</h4>
        <ul className="flex flex-col gap-2">
          {recommendedSkills.map((skill, idx) => (
            <li key={idx} className="flex items-start gap-2 text-gray-600 dark:text-gray-400">
              <Check className="w-4 h-4 mt-0.5 shrink-0 opacity-50" />
              <span>{skill}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-3">
        <h4 className="text-sm font-bold text-gray-500 dark:text-gray-400">유망 툴</h4>
        <div className="flex flex-wrap gap-2">
          {tools.map((tool, idx) => (
            <span key={idx} className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-lg text-sm font-medium">
              {tool}
            </span>
          ))}
        </div>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mt-2 border-t border-gray-100 dark:border-gray-800 pt-6 mt-auto">
        이러한 AI 기반 툴들을 활용하여 생산성을 높이고, 더 높은 수준의 업무에 집중하세요. AI와 협업하여 차별화된 역량을 키워나가는 것이 중요합니다.
      </p>
    </div>
  );
};
