import { Skeleton } from '@/components/ui/skeleton';

const Loading = () => {
  return (
    <main className="flex flex-col items-center p-4 md:p-12">
      <div className="grid w-full gap-8 md:grid-cols-[1fr,2fr]">
        <div className="flex flex-col items-center gap-8">
          <Skeleton className="h-64 w-64 rounded-lg" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-6 w-1/2" />
        </div>
        <div className="flex flex-col items-center gap-4 md:items-start">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <div className="flex gap-4">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
          <div className="prose w-full">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </div>
    </main>
  );
};

export default Loading;
