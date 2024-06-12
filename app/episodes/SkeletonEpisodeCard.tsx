import { Skeleton } from '@/components/ui/skeleton';

export const SkeletonEpisodeCard = () => {
  return (
    <div className="flex w-full flex-col items-start gap-4 rounded-lg border p-4 shadow-sm md:flex-row md:items-center">
      <div className="h-36 w-full rounded-lg bg-gray-300 md:w-36">
        <Skeleton className="h-full w-full" />
      </div>
      <div className="flex w-full flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex-1">
          <div className="mt-3 flex items-center gap-2 text-sm">
            <div className="h-6 w-6 rounded-full bg-gray-300">
              <Skeleton className="h-full w-full rounded-full" />
            </div>
            <Skeleton className="h-6 w-1/2" />
          </div>
          <Skeleton className="mt-2 h-8 w-3/4" />
          <Skeleton className="h-6 w-1/2" />
          <div className="mt-2 flex items-end gap-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </div>
    </div>
  );
};
