import { SkeletonEpisodeCard } from '@/app/episodes/SkeletonEpisodeCard';
import EpisodeGrid from '@/app/user/[username]/ratings/EpisodeGrid';
import { Suspense } from 'react';

const Page = async ({ params }: { params: { username: string } }) => {
  return (
    <div className="container pb-24">
      <h1 className="mb-8 mt-6 grid place-items-center text-2xl font-semibold ">
        {params.username}&rsquo;s Rated Episodes
      </h1>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <Suspense
          fallback={[1, 2, 3, 4, 5, 6].map((i) => (
            <SkeletonEpisodeCard key={i}></SkeletonEpisodeCard>
          ))}
        >
          <EpisodeGrid username={params.username} />
        </Suspense>
      </div>
    </div>
  );
};

export default Page;
