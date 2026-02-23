import { EpisodeCard, EpisodeForCard } from '@/app/episodes/EpisodeCard';
import { Button } from '@/components/ui/button';
import { getCachedPopularEpisodes } from '@/utils/supabase/server-cache';
import { createClient } from '@/utils/supabase/ssr';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Fragment } from 'react';

export const EpisodeGridLanding = async () => {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;

  const episodeData = await getCachedPopularEpisodes(userId);
  const episodes = episodeData?.map((episode: any) => ({
    ...episode,
    review_type: episode?.podcast_episode_review?.[0]?.review_type || null,
  }));

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
