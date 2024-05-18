import { EpisodeCard } from '@/app/episodes/EpisodeCard';
import { Button } from '@/components/ui/button';
import { createClient } from '@/utils/supabase/server';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Fragment } from 'react';

export const EpisodeGridLanding = async () => {
  const supabase = createClient();
  const { data } = await supabase
    .rpc('search_episodes_by_relevance', {})
    .limit(5);

  return (
    <Fragment>
      {data?.map((episode: any) => (
        <EpisodeCard episode={episode} key={episode.id} />
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
