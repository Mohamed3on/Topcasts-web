import { EpisodeCard, EpisodeForCard } from '@/app/episodes/EpisodeCard';
import { Button } from '@/components/ui/button';
import { createClient } from '@/utils/supabase/ssr';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Fragment } from 'react';

type Episode = {
  id: number;
  slug: string | null;
  episode_name: string | null;
  image_url: string | null;
  podcast_name: string | null;
  description: string | null;
  twitter_shares: number | null;
  likes: number | null;
  dislikes: number | null;
  podcast_episode_review?: {
    review_type: string;
    user_id: string;
    episode_id: number;
  }[];
};

const getEpisodes = async () => {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  let episodeData: Episode[] | null = null;

  if (!userId) {
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
      dislikes`,
      )
      .order('popularity_score', { ascending: false })
      .limit(5);
    episodeData = data as Episode[] | null;
  } else {
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
    podcast_episode_review(review_type, user_id, episode_id)`,
      )
      .eq('podcast_episode_review.user_id', userId)
      .order('popularity_score', { ascending: false })
      .limit(5);
    episodeData = data as Episode[] | null;
  }

  const episodes = episodeData?.map((episode) => {
    return {
      ...episode,
      review_type: episode?.podcast_episode_review?.[0]?.review_type || null,
    };
  });

  return episodes;
};

export const EpisodeGridLanding = async () => {
  const episodes = await getEpisodes();

  return (
    <Fragment>
      {episodes?.map((episode) => (
        <EpisodeCard
          episode={episode as EpisodeForCard}
          key={episode.id}
        ></EpisodeCard>
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
