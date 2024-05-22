import { EpisodeCard, EpisodeForCard } from '@/app/episodes/EpisodeCard';
import { Button } from '@/components/ui/button';
import { createClient } from '@/utils/supabase/server';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Fragment } from 'react';

const getEpisodes = async () => {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  const { data } = await supabase
    .from(`episode_with_rating_data`)
    .select(
      `id,
      slug,
      episode_name,
      image_url,
      podcast_name,
      description,
      twitter_shares,
      likes,
      dislikes,
    podcast_episode_review!inner(review_type, user_id, episode_id)`,
    )
    .eq('podcast_episode_review.user_id', userId || 0)
    .order('twitter_shares', { ascending: false })
    .limit(5);

  const episodes = data?.map((episode) => {
    return {
      ...episode,
      review_type: episode.podcast_episode_review?.[0].review_type,
    };
  });

  return episodes;
};

export const EpisodeGridLanding = async () => {
  const episodes = await getEpisodes();

  return (
    <Fragment>
      {episodes?.map((episode) => (
        <EpisodeCard episode={episode as EpisodeForCard} key={episode.id} />
      ))}
      <Button
        className="text-md group grid transform place-self-center transition duration-100 active:scale-95"
        asChild
        variant={'link'}
      >
        <Link href="/episodes">
          <div className="flex items-center gap-1">
            <span>View all episodes</span>
            <ArrowRight className="h-4 w-4 translate-x-0 transform transition-transform duration-300 group-hover:translate-x-1" />
          </div>
        </Link>
      </Button>
    </Fragment>
  );
};
