import { Skeleton } from '@/components/ui/skeleton';

const Loading = () => {
  return (
    <main className="flex flex-col items-center justify-between p-4 md:p-12">
      <div className="flex w-full flex-col items-center justify-center gap-8">
        <Skeleton className="mb-4 h-8 w-3/4" />
        <Skeleton className="h-64 w-64 rounded-lg" />
        <Skeleton className="mt-4 h-6 w-1/2" />
        <div className="mt-4 flex flex-col items-center gap-4">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-1/4" />

          <div className="mt-4 flex items-center justify-center gap-4">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </div>
        <div className="prose mt-4 w-full">
          <Skeleton className="mb-2 h-4 w-full" />
          <Skeleton className="mb-2 h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    </main>
  );
};

export default Loading;
