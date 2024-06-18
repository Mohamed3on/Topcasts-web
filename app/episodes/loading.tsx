import { SkeletonEpisodeCard } from '@/app/episodes/SkeletonEpisodeCard';

export function EpisodesLoadingPage() {
  return (
    <div className="container flex flex-col gap-8 pb-24">
      <div className="flex flex-col items-center gap-8">
        <h1 className="mt-6 text-center text-2xl font-semibold">
          Browse the best podcast episodes, curated by people like you
        </h1>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <SkeletonEpisodeCard key={i}></SkeletonEpisodeCard>
          ))}
        </div>
      </div>
    </div>
  );
}

export default EpisodesLoadingPage;
