import { SkeletonRatingCard } from '@/app/episodes/SkeletonRatingCard';
import EpisodeGrid from '@/app/user/[username]/ratings/EpisodeGrid';
import { Suspense } from 'react';

const Page = async ({ params }: { params: { username: string } }) => {
  return (
    <div className="container pb-24">
      <h1 className="mb-8 mt-6 grid place-items-center text-2xl font-semibold ">
        {params.username}&rsquo;s Rated Episodes
      </h1>
      <div className="flex flex-col gap-6">
        <Suspense
          fallback={[1, 2, 3, 4, 5, 6].map((i) => (
            <SkeletonRatingCard key={i}></SkeletonRatingCard>
          ))}
        >
          <EpisodeGrid username={params.username} />
        </Suspense>
      </div>
    </div>
  );
};

export default Page;
