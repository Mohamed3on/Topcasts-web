import AddEpisodeButton from '@/app/AddEpisodeButton';
import { EpisodeGridLanding } from '@/app/EpisodeGridLanding';
import { SkeletonEpisodeCard } from '@/app/episodes/SkeletonEpisodeCard';
import AppleIcon from '@/components/AppleIcon';
import { SpotifyIcon } from '@/components/SpotifyIcon';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';
import castro from '/castro.jpg';
import Image from 'next/image';

export default async function Home() {
  return (
    <div className="container flex w-screen flex-col items-center justify-center gap-4">
      <div className="flex flex-col gap-2">
        <div className="flex max-w-lg flex-col gap-2">
          <h1 className="tracking-tight-tight text-center  text-4xl font-extrabold text-black sm:text-6xl">
            Discover your next favourite
            <p className="via-light-blue-500 bg-gradient-to-r from-sky-500 to-blue-500 bg-clip-text text-transparent">
              Podcast Episode
            </p>
          </h1>
          <h2 className="text-center text-lg text-foreground/50">
            Track, share, and find your favourite podcast episodes
          </h2>
        </div>
      </div>
      <div className="flex flex-col items-center gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-center gap-1 text-sm text-foreground/50">
            Supported:
            <AppleIcon className="h-4 w-4" />
            <SpotifyIcon className="h-4 w-4" />
            <Image
              src="/castro.jpg"
              width={16}
              height={16}
              alt="Castro"
            ></Image>
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
      <div className="flex w-screen flex-col items-center gap-4 rounded-lg border-y border-gray-200 p-4">
        <h2 className="text-2xl font-semibold">Popular Episodes</h2>
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Suspense
            fallback={[1, 2, 3, 4, 5].map((i) => (
              <SkeletonEpisodeCard key={i}></SkeletonEpisodeCard>
            ))}
          >
            <EpisodeGridLanding />
          </Suspense>
        </ul>
      </div>
    </div>
  );
}
