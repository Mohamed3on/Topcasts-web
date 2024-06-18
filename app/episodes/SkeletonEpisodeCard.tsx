import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export const SkeletonEpisodeCard = () => {
  return (
    <Card className="w-[450px] max-w-full overflow-hidden rounded-lg shadow-sm">
      <div className="h-full">
        <div className="overflow-hidden rounded-lg">
          <Skeleton className="h-56 w-full object-cover" />
        </div>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between gap-1">
            <div>
              <Skeleton className="mb-2 h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
            <div className="flex space-x-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
          </div>
          <div className="prose mt-3">
            <Skeleton className="mb-2 h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </CardContent>
        <CardFooter className="justify-between">
          <Skeleton className="h-6 w-full" />
        </CardFooter>
      </div>
    </Card>
  );
};
