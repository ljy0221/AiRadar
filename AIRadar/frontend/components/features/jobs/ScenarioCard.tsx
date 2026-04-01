interface ScenarioCardProps {
  taskTitle: string;
  description: string;
  steps: string[];
}

export const ScenarioCard = ({ taskTitle, description, steps }: ScenarioCardProps) => {
  const hasDescription = Boolean(description?.trim());
  const hasSteps = Array.isArray(steps) && steps.length > 0;
  const hasContent = hasDescription || hasSteps;

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col gap-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-[#1a1c2e] md:p-10">
      <div className="shrink-0 flex flex-col gap-1">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white md:text-2xl">시나리오</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">{taskTitle}</p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-6">
        {hasContent ? (
          <>
            {hasDescription && (
              <div className="shrink-0">
                <h4 className="mb-2 text-sm font-bold text-gray-500 dark:text-gray-400">업무 내용</h4>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{description}</p>
              </div>
            )}

            {hasSteps && (
              <div className="min-h-0 shrink-0">
                <h4 className="mb-4 text-sm font-bold text-gray-500 dark:text-gray-400">수행 단계</h4>
                <div className="flex flex-col gap-4">
                  {steps.map((step, index) => (
                    <div key={index} className="flex gap-4">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent)]/20 text-sm font-bold text-[var(--color-accent)]">
                        {index + 1}
                      </div>
                      <p className="pt-0.5 leading-relaxed text-gray-700 dark:text-gray-300">{step}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="shrink-0 text-sm text-gray-500 dark:text-gray-400">등록된 시나리오 상세가 없습니다.</p>
        )}
      </div>
    </div>
  );
};
