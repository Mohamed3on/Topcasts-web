import RatingButtons from '@/app/episodes/RatingButtons';
import { EpisodeDetailsForList } from '@/app/episodes/page';
import { Card, CardContent } from '@/components/ui/card';

import Link from 'next/link';

export const EpisodeCard = ({
  episode,
}: {
  episode: EpisodeDetailsForList[number];
}) => {
  return (
    <Card className="overflow-hidden rounded-lg shadow-sm transition duration-100 ease-in-out hover:shadow-lg ">
      <Link
        className="block h-full"
        href={`/episode/${episode.id}/${episode.slug}`}
      >
        <div className="overflow-hidden rounded-lg">
          <img
            alt={episode.episode_name || ''}
            className="h-48 w-full object-cover sm:h-56"
            src={episode.image_url || ''}
          />
        </div>
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-1">
            <div>
              <h3 className="line-clamp-4 text-lg font-medium text-gray-900 hover:h-auto">
                {episode.episode_name}
              </h3>
              <p className="mt-1 text-sm font-semibold text-gray-500">
                {episode.podcast_name}
              </p>
            </div>
            <RatingButtons episode={episode}></RatingButtons>
          </div>
          <div
            suppressHydrationWarning
            className="prose mt-3 line-clamp-2 text-sm text-gray-500"
          >
            <span>{episode.description}</span>
          </div>
        </CardContent>
      </Link>
    </Card>
  );
};
