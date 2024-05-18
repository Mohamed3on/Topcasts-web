import { EpisodePagination } from '@/app/episodes/EpisodesPagination';
import EpisodesList from '@/app/episodes/List';
import { SkeletonEpisodeCard } from '@/app/episodes/SkeletonEpisodeCard';
import { Metadata } from 'next';
import { Fragment, Suspense } from 'react';

export const metadata: Metadata = {
  title: 'Episodes',
  description: 'Discover the best podcast episodes on the internet.',
};

export default async function Episodes({
  searchParams,
}: {
  searchParams?: {
    [key: string]: string;
  };
}) {
  return (
    <div className="container flex flex-col gap-8 pb-24">
      <h1 className="mt-6 grid place-items-center text-2xl font-semibold ">
        Browse the best podcast episodes, curated by real people
      </h1>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <Suspense
          fallback={
            <Fragment>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <SkeletonEpisodeCard key={i}></SkeletonEpisodeCard>
              ))}
            </Fragment>
          }
        >
          <EpisodesList searchParams={searchParams} />
        </Suspense>
      </div>
      <EpisodePagination />
    </div>
  );
}
