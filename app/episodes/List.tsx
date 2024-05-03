import { EpisodeDetailsForList } from '@/app/episodes/page';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ThumbsDownIcon, ThumbsUp } from 'lucide-react';
import Link from 'next/link';

export default function EpisodesList({ episodes }: { episodes: EpisodeDetailsForList }) {
  return (
    <div className='container pb-24'>
      <h1 className='text-2xl font-semibold grid place-items-center mb-8 mt-6'>
        Browse the best podcast episodes, curated by real people
      </h1>
      <div className='grid gap-5 grid-cols-1  sm:grid-cols-2 lg:grid-cols-3 '>
        {episodes.map((episode) => (
          <Card
            key={episode.id}
            className=' rounded-lg shadow-sm hover:shadow-lg transition duration-100 ease-in-out '
          >
            <Link className='block h-full' href={`/episode/${episode.id}/${episode.slug}`}>
              <div className='overflow-hidden rounded-lg'>
                <img
                  alt={episode.episode_name || ''}
                  className='object-cover w-full h-48 sm:h-56'
                  src={episode.image_url || ''}
                />
              </div>
              <CardContent className='p-4'>
                <div className=' flex items-center justify-between'>
                  <div>
                    <h3 className='text-lg font-medium text-gray-900 dark:text-gray-50 line-clamp-4 hover:h-auto'>
                      {episode.episode_name}
                    </h3>
                    <p className='mt-1 text-sm text-gray-500 dark:text-gray-400'>
                      {episode.podcast_name}
                    </p>
                  </div>
                  <div className='flex  gap-1'>
                    <Button
                      className='  flex gap-1 justify-center items-center'
                      size='icon'
                      variant='ghost'
                    >
                      <ThumbsUp className='h-5 w-5' />
                      <span className='sr-only'>Like</span>
                      <span className='text-xs font-medium'>{episode.likes}</span>
                    </Button>
                    <Button
                      className=' flex gap-1 justify-center items-center'
                      size='icon'
                      variant='ghost'
                    >
                      <ThumbsDownIcon className='h-5 w-5' />
                      <span className='sr-only'>Dislike</span>
                      <span className='text-xs font-medium'>{episode.dislikes}</span>
                    </Button>
                  </div>
                </div>
                <p className='mt-3 text-sm text-gray-500 line-clamp-3 dark:text-gray-400'>
                  {episode.description}
                </p>
              </CardContent>
            </Link>
          </Card>
        ))}
      </div>
    </div>
  );
}
