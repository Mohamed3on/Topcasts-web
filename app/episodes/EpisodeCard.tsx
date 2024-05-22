import RatingButtons from '@/app/episodes/RatingButtons';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Twitter } from 'lucide-react';

import Link from 'next/link';

export type EpisodeForCard = {
  id: number;
  slug: string;
  episode_name: string;
  image_url: string;
  podcast_name: string;
  description: string;
  twitter_shares: number;
  review_type: string;
  likes: number;
  dislikes: number;
};
export const EpisodeCard = ({ episode }: { episode: EpisodeForCard }) => {
  return (
    <Card className="overflow-hidden rounded-lg shadow-sm transition duration-100 ease-in-out hover:shadow-lg ">
      <Link className="h-full" href={`/episode/${episode.id}/${episode.slug}`}>
        <div className="overflow-hidden rounded-lg">
          <img
            loading="lazy"
            alt={episode.episode_name || ''}
            className="h-48 w-full object-cover sm:h-56"
            src={episode.image_url || ''}
          />
        </div>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between gap-1">
            <div>
              <h3 className="line-clamp-2 text-lg font-medium text-gray-900 hover:h-auto sm:line-clamp-4">
                {episode.episode_name}
              </h3>
              <p className="mt-1 text-sm font-semibold text-gray-500">
                {episode.podcast_name}
              </p>
            </div>
            <RatingButtons episode={episode} />
          </div>
          <div
            suppressHydrationWarning
            className="prose mt-3 line-clamp-1 text-sm text-gray-500 sm:line-clamp-2"
          >
            <span>{episode.description}</span>
          </div>
        </CardContent>
        <CardFooter className="justify-between">
          {episode.twitter_shares > 0 && (
            <div className="flex items-center gap-1 text-blue-400">
              <Twitter className="h-4 w-4" />
              <span>
                {' '}
                Recommended by {episode.twitter_shares} Twitter users{' '}
              </span>
            </div>
          )}
        </CardFooter>
      </Link>
    </Card>
  );
};
