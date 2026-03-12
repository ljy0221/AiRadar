interface JobHeaderProps {
  jobTitle: string;
  category: string;
  aiRiskScore: number;
}

export const JobHeader = ({ jobTitle, category, aiRiskScore }: JobHeaderProps) => {
  return (
    <div className="flex flex-col gap-4 mb-10 w-full mt-8">
      <div className="flex items-center gap-4">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{jobTitle}</h1>
        <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full text-sm font-medium">
          {category}
        </span>
      </div>
      
      <div className="flex items-center gap-4 mt-2">
        <span className="text-sm font-semibold text-gray-500 whitespace-nowrap">AI 대체 위험도:</span>
        <div className="flex-1 max-w-sm h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-[var(--color-accent)] rounded-full transition-all duration-500"
            style={{ width: `${(aiRiskScore / 10) * 100}%` }}
          />
        </div>
        <span className="text-sm font-bold text-[var(--color-accent)]">
          {aiRiskScore.toFixed(1)}/10
          <span className="text-gray-400 font-medium ml-1">
             ({aiRiskScore >= 7 ? 'HIGH' : aiRiskScore >= 4 ? 'MEDIUM' : 'LOW'})
          </span>
        </span>
      </div>
    </div>
  );
};
