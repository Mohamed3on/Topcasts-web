import AddEpisodeButton from '@/app/AddEpisodeButton';
import { EpisodeCard } from '@/app/episodes/EpisodeCard';
import AppleIcon from '@/components/AppleIcon';
import { SpotifyIcon } from '@/components/SpotifyIcon';
import { Button } from '@/components/ui/button';
import { createClient } from '@/utils/supabase/server';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default async function Home() {
  const supabase = createClient();
  const { data } = await supabase
    .rpc('search_episodes_by_relevance', {})
    .limit(5);

  return (
    <div className="container flex w-screen flex-col items-center justify-center gap-4">
      <div className="flex flex-col gap-2">
        <div className="flex max-w-xl flex-col gap-2">
          <h1 className=" text-center text-4xl  font-extrabold text-black sm:text-6xl">
            Discover your next favourite
            <p className="via-light-blue-500 bg-gradient-to-r from-sky-500 to-blue-500 bg-clip-text text-transparent">
              Podcast Episode
            </p>
          </h1>
          <h2 className="text-center text-lg text-foreground/50">
            Topcasts is the #1 platform to save and share your favourite podcast
            episodes
          </h2>
        </div>
      </div>
      <div className="flex flex-col items-center gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-center gap-1 text-sm text-foreground/50">
            Supported:
            <SpotifyIcon className="h-4 w-4" />
            <img
              src="https://castro.fm/assets/images/Bitmap.svg"
              className="h-4 w-4"
              alt="Castro"
            ></img>
            <AppleIcon className="h-4 w-4" />
          </div>
          <AddEpisodeButton>
            <Button className="group transform transition duration-100 active:scale-95">
              <div className="flex items-center gap-1">
                <span>Save your favourite episode</span>
                <ArrowRight className="h-4 w-4 translate-x-0 transform transition-transform duration-300 group-hover:translate-x-1" />
              </div>
            </Button>
          </AddEpisodeButton>
        </div>
        <p className="text-center text-primary/70">or</p>

        <Button
          asChild
          variant={'secondary'}
          className="group transform transition duration-100 active:scale-95"
        >
          <Link href="/episodes">
            <div className="flex items-center gap-1">
              <span>Explore top episodes</span>
              <ArrowRight className="h-4 w-4 translate-x-0 transform transition-transform duration-300 group-hover:translate-x-1 " />
            </div>
          </Link>
        </Button>
      </div>
      <div className="flex w-screen flex-col items-center gap-4 rounded-lg border-y border-gray-200 p-4 shadow-md">
        <h2 className="text-2xl font-semibold">Popular Episodes</h2>
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
        </ul>
      </div>
    </div>
  );
}
