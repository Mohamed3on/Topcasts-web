import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ThumbsUp, ThumbsDown, Twitter } from 'lucide-react';
import { EpisodePagination } from '@/app/episodes/EpisodesPagination';
import { createClient } from '@/utils/supabase/ssr';
import Link from 'next/link';

async function getEpisodes(podcastId: number, page: number, pageSize: number) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('episode_with_rating_data')
    .select(
      'id, episode_name, date_published, description, likes, dislikes, twitter_shares, popularity_score',
    )
    .eq('podcast_id', podcastId)
    .order('popularity_score', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (error) {
    console.error('Error fetching episodes:', error);
    return { episodes: [], hasNextPage: false };
  }

  return {
    episodes: data,
    hasNextPage: data.length === pageSize,
  };
}

export default async function PodcastEpisodes({
  podcastId,
  page = 1,
}: {
  podcastId: number;
  page?: number;
}) {
  const pageSize = 25;
  const { episodes, hasNextPage } = await getEpisodes(
    podcastId,
    page,
    pageSize,
  );

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Top Episodes</h2>
      {episodes.map((episode) => (
        <Card key={episode.id}>
          <CardHeader>
            <Link href={`/episode/${episode.id}`} className="hover:underline">
              <CardTitle>{episode.episode_name}</CardTitle>
            </Link>
          </CardHeader>
          <CardContent>
            <p className="mb-2 text-sm text-gray-600">
              {new Date(episode.date_published!).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center text-green-500">
                  <ThumbsUp className="mr-1 h-4 w-4" />
                  <span>{episode.likes}</span>
                </div>
                <div className="flex items-center text-red-500">
                  <ThumbsDown className="mr-1 h-4 w-4" />
                  <span>{episode.dislikes}</span>
                </div>
              </div>
              <p className="flex items-center text-sm text-primary/70">
                <Twitter className="mr-1 h-4 w-4" />
                {episode.twitter_shares}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
      <EpisodePagination hasNextPage={hasNextPage} />
    </div>
  );
}
