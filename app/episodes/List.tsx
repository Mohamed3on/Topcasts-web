import { EpisodeCard, EpisodeForCard } from '@/app/episodes/EpisodeCard';
import { EpisodePagination } from '@/app/episodes/EpisodesPagination';
import { Fragment } from 'react';

export default async function EpisodesList({
  episodes,
  hasNextPage,
}: {
  episodes: EpisodeForCard[];
  hasNextPage: boolean;
}) {
  return (
    <Fragment>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {episodes.map((episode) => (
          <EpisodeCard
            key={episode.id}
            episode={episode as EpisodeForCard}
          ></EpisodeCard>
        ))}
      </div>
      <EpisodePagination hasNextPage={hasNextPage} />
    </Fragment>
  );
}
