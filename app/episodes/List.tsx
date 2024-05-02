import { EpisodeDetails } from '@/app/api/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ThumbsDownIcon } from 'lucide-react';
import Link from 'next/link';

export default function EpisodesList({ episodes }: { episodes: EpisodeDetails[] }) {
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
            <Link href={`/episode/${episode.id}/${episode.slug}`}>
              <div className='aspect-auto overflow-hidden rounded-lg'>
                <img
                  alt={episode.episode_name}
                  className='object-cover object-center'
                  src={
                    episode.image_url ||
                    'https://res.cloudinary.com/dkkf9iqnd/image/upload/v1634264307/placeholder.svg'
                  }
                  style={{
                    aspectRatio: '600/400',
                    objectFit: 'cover',
                  }}
                  width={600}
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
                  <div className='flex items-center space-x-3'>
                    <Button
                      className='text-green-500 hover:text-green-600 dark:text-green-500 dark:hover:text-green-400 flex gap-1 justify-center items-center'
                      size='icon'
                      variant='ghost'
                    >
                      <ThumbsDownIcon className='h-5 w-5' />
                      <span className='sr-only'>Dislike</span>
                      <span className='text-xs font-medium'>0</span>
                    </Button>
                    <Button
                      className='text-red-500 hover:text-red-600 dark:text-red-500 dark:hover:text-red-400 flex gap-1 justify-center items-center'
                      size='icon'
                      variant='ghost'
                    >
                      <ThumbsDownIcon className='h-5 w-5' />
                      <span className='sr-only'>Dislike</span>
                      <span className='text-xs font-medium'>0</span>
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
