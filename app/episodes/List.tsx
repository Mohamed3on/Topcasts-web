import { EpisodeCard } from '@/app/episodes/EpisodeCard';
import { EpisodePagination } from '@/app/episodes/EpisodesPagination';
import { EpisodeDetailsForList } from '@/app/episodes/page';

export default function EpisodesList({
  episodes,
}: {
  episodes: EpisodeDetailsForList;
}) {
  return (
    <div className="container flex flex-col gap-8 pb-24">
      <h1 className="mt-6 grid place-items-center text-2xl font-semibold ">
        Browse the best podcast episodes, curated by real people
      </h1>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {episodes.map((episode) => (
          <EpisodeCard key={episode.id} episode={episode} />
        ))}
      </div>
      <EpisodePagination />
    </div>
  );
}
