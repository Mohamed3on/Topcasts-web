import RatingButtons from '@/app/episodes/RatingButtons';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Twitter } from 'lucide-react';
import Image from 'next/image';

import Link from 'next/link';

export type EpisodeForCard = {
  id: number;
  slug: string | null;
  episode_name: string | null;
  image_url: string | null;
  description: string | null;
  review_type?: string;
  review_text?: string;
  podcast_name: string;
  twitter_shares: number;
  likes: number;
  dislikes: number;
};

export const EpisodeCardDescription = ({
  episode,
}: {
  episode: EpisodeForCard;
}) => {
  return (
    <div className="prose mt-3 line-clamp-1 text-sm text-gray-500 sm:line-clamp-2">
      <span>{episode.description}</span>
    </div>
  );
};
export const EpisodeCard = ({ episode }: { episode: EpisodeForCard }) => {
  return (
    <Card className="overflow-hidden rounded-lg shadow-sm transition duration-100 ease-in-out hover:shadow-lg ">
      <Link className="h-full" href={`/episode/${episode.id}/${episode.slug}`}>
        <div className="overflow-hidden rounded-lg">
          <Image
            width={224}
            height={224}
            loading="lazy"
            alt={episode.episode_name || ''}
            className="h-48 w-full object-cover sm:h-56"
            src={episode.image_url || ''}
          />
        </div>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between gap-1">
            <div>
              <h3 className="line-clamp-2 text-lg font-medium text-secondary-foreground/90 hover:h-auto sm:line-clamp-4">
                {episode.episode_name}
              </h3>
              <p className="mt-1 text-sm font-semibold text-gray-500">
                {episode.podcast_name}
              </p>
            </div>
            <RatingButtons episode={episode} />
          </div>
          {<EpisodeCardDescription episode={episode} />}
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
