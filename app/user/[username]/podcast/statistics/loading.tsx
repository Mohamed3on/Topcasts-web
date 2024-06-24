import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const Loading = () => {
  return (
    <div className="container flex flex-col items-center gap-4 pb-4">
      <Skeleton className="mb-4 h-8 w-64" />
      <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(8)].map((_, index) => (
          <Card key={index} className="flex flex-col justify-between">
            <div className="pl-3 pt-3">
              <Skeleton className="h-6 w-6" />
            </div>
            <div className="flex flex-col items-center gap-2 p-4">
              <Skeleton className="h-24 w-24 rounded-full" />
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
            <div className="flex justify-end p-4">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-8" />
                <Skeleton className="h-4 w-8" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Loading;
