import { Database } from '@/app/api/types/supabase';
import { cn } from '@/lib/utils';
import { createClient } from '@/utils/supabase/ssr';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Fragment } from 'react';

export type EpisodeForCard =
  Database['public']['Tables']['podcast_episode']['Row'] & {
    review_type?: string;
    review_text?: string;
    podcast_name: string;
    twitter_shares: number;
    likes: number;
    dislikes: number;
  };
const fetchUserEpisodes = async (id: string) => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('podcast_episode_review')
    .select(
      `
    review_type,
    text,
    user_id,
    updated_at,
    episode_with_rating_data(
      id,
      slug,
      episode_name,
      image_url,
      podcast_name,
      description,
      twitter_shares,
      likes,
      dislikes
    )
  `,
    )
    .eq('user_id', id)
    .order('updated_at', { ascending: false })
    .limit(30);

  if (error || !data) {
    console.error('Error fetching user ratings:', error);
    return [];
  }

  return data;
};

const RatingsList = async ({ username }: { username: string }) => {
  const supabase = await createClient();

  const { data: userData } = await supabase
    .from('profiles')
    .select('id, name,avatar_url')
    .eq('username', username)
    .single();

  if (!userData) {
    notFound();
  }

  const userEpisodes = await fetchUserEpisodes(userData.id);

  if (!userEpisodes?.length) {
    notFound();
  }

  let mappedEpisodes = userEpisodes.map((episode) => {
    return {
      ...episode.episode_with_rating_data,
      review_type: episode.review_type,
      review_text: episode.text,
    };
  });

  return (
    <Fragment>
      <div className="flex flex-col gap-6">
        {mappedEpisodes.map((episode) => (
          <EpisodeCard
            user={userData}
            key={episode.id}
            episode={episode as EpisodeForCard}
          />
        ))}
      </div>
    </Fragment>
  );
};

const EpisodeCard = ({
  episode,
  user,
}: {
  episode: EpisodeForCard;
  user?: { id: string; name: string | null; avatar_url: string | null };
}) => {
  const isLiked = episode.review_type === 'like';
  return (
    <Link className="h-full" href={`/episode/${episode.id}/${episode.slug}`}>
      <div
        className={cn(
          'flex w-full flex-col items-start gap-4 rounded-lg border p-4 hover:shadow-md active:shadow-none md:flex-row md:items-center',
          isLiked ? 'border-green-500' : 'border-red-500',
        )}
      >
        <Image
          width={100}
          height={100}
          loading="lazy"
          alt={episode.episode_name || ''}
          className="h-auto w-full rounded-lg md:w-36"
          src={episode.image_url || ''}
        />
        <div className="flex w-full flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex-1">
            <div className="mt-3 flex items-center gap-2 text-sm">
              <Image
                width={24}
                height={24}
                src={user?.avatar_url || ''}
                alt="User Image"
                className="rounded-full"
              />
              {episode.review_type === 'like' ? (
                <span className=" text-green-500">{`${user?.name} liked`}</span>
              ) : (
                <span className=" text-red-500">{`${user?.name} disliked`}</span>
              )}
            </div>
            <h2 className="text-xl font-semibold">{episode.episode_name}</h2>
            <p className="text-muted-foreground">{episode.podcast_name}</p>

            {episode.review_text && (
              <div className="flex items-end gap-2">
                <span className="prose mt-3 text-sm italic text-primary">
                  {episode.review_text}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
};

export default RatingsList;
