import { Card, CardFooter, CardHeader } from '@/components/ui/card';
import { createClient } from '@/utils/supabase/ssr';
import { ThumbsDown, ThumbsUp } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

const fetchUserTopPodcasts = async (username: string) => {
  const supabase = createClient();

  const { data, error } = await supabase.rpc('get_podcast_reviews', {
    username_param: username,
  });

  if (error || !data) {
    console.error('Error fetching user ratings:', error);
    notFound();
  }

  return data;
};

const GroupedRatings = async ({ params }: { params: { username: string } }) => {
  const groupedByPodcast = await fetchUserTopPodcasts(params.username);

  const sortFunction = (
    a: {
      review_difference: number;
      likes_count: number;
      dislikes_count: number;
    },
    b: {
      review_difference: number;
      likes_count: number;
      dislikes_count: number;
    },
  ) => {
    const bRatio =
      b.review_difference *
      (b.likes_count / (b.likes_count + b.dislikes_count));
    const aRatio =
      a.review_difference *
      (a.likes_count / (a.likes_count + a.dislikes_count));
    return bRatio - aRatio;
  };

  const sorted = groupedByPodcast.sort(sortFunction);

  return (
    <div className="container flex flex-col items-center gap-4 pb-4">
      <h1 className="text-center text-2xl font-semibold">
        {params.username}&apos;s Top Podcasts
      </h1>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {sorted.map((podcast, index) => (
          <Card
            key={podcast.podcast_name}
            className="flex flex-col justify-between hover:shadow-md"
          >
            <div className="pl-3 pt-3">
              <div className="text-primary">{index + 1}.</div>
            </div>
            <CardHeader className="flex flex-col items-center gap-2">
              <Image
                width={50}
                className="rounded-full"
                height={50}
                src={podcast.image_url || ''}
                alt={podcast.podcast_name}
              />

              <div>
                <Link className="" href={`/podcast/${podcast.id}`}>
                  <h2 className="text-center text-lg font-semibold transition-colors duration-100 hover:text-secondary-foreground/50 hover:underline">
                    {podcast.podcast_name}
                  </h2>
                </Link>

                <h3 className="text-center text-muted-foreground">
                  {podcast.artist_name}
                </h3>
              </div>
            </CardHeader>
            <CardFooter className="flex justify-end">
              <div className="flex items-center gap-2">
                <div className="flex items-center text-green-500">
                  <ThumbsUp className="mr-1 h-4 w-4" />
                  <span>{podcast.likes_count}</span>
                </div>
                <div className="flex items-center text-red-500">
                  <ThumbsDown className="mr-1 h-4 w-4" />
                  <span>{podcast.dislikes_count}</span>
                </div>
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default GroupedRatings;
