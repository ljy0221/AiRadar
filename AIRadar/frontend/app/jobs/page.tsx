import { JobSearch } from '@/components/features/jobs/JobSearch';

export default function JobsPage() {
  return (
    <div className="w-full h-full flex flex-col pt-16 md:pt-32">
      <JobSearch />
    </div>
  );
}
