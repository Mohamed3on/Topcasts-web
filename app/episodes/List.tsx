import { EpisodeCard } from '@/app/episodes/EpisodeCard';
import { EpisodeDetailsForList } from '@/app/episodes/page';

export default function EpisodesList({
  episodes,
}: {
  episodes: EpisodeDetailsForList;
}) {
  return (
    <div className="container pb-24">
      <h1 className="mb-8 mt-6 grid place-items-center text-2xl font-semibold ">
        Browse the best podcast episodes, curated by real people
      </h1>
      <div className="grid grid-cols-1 gap-5  sm:grid-cols-2 lg:grid-cols-3">
        {episodes.map((episode) => (
          <EpisodeCard key={episode.id} episode={episode} />
        ))}
      </div>
    </div>
  );
}
