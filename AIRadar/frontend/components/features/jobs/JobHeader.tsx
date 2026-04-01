interface JobHeaderProps {
  jobTitle: string;
  category: string;
}

export const JobHeader = ({ jobTitle, category }: JobHeaderProps) => {
  return (
    <div className="flex flex-col gap-4 mb-4 w-full mt-8">
      <div className="flex flex-col items-start gap-4">
        <span className="px-3 py-1 bg-[var(--color-accent)]/10 text-[var(--color-accent)] rounded-md text-sm font-bold">
          {category}
        </span>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-[var(--color-text-primary)]">
          {jobTitle}
        </h1>
      </div>
    </div>
  );
};
