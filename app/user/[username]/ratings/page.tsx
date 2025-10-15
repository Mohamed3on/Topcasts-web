import { SkeletonRatingCard } from '@/app/episodes/SkeletonRatingCard';
import RatingsList from '@/app/user/[username]/ratings/RatingsList';
import { Suspense } from 'react';

const Page = async ({ params }: { params: Promise<{ username: string }> }) => {
  const { username } = await params;
  return (
    <div className="container pb-24">
      <h1 className="mb-8 mt-6 grid place-items-center text-2xl font-semibold ">
        {username}&rsquo;s Rated Episodes
      </h1>
      <div className="flex flex-col gap-6">
        <Suspense
          fallback={[1, 2, 3, 4, 5, 6].map((i) => (
            <SkeletonRatingCard key={i}></SkeletonRatingCard>
          ))}
        >
          <RatingsList username={username} />
        </Suspense>
      </div>
    </div>
  );
};

export default Page;
