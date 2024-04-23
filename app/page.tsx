import { EpisodeDetails } from './api/types';

import { PodcastDetails } from '@/app/PodcastDetails';
import Header from '@/app/Header';

export const dynamic = 'force-dynamic';

// const getEpisodeDetails = async (episodeUrl: string) => {
//   const url = `${getHost()}/api/episode?url=${encodeURIComponent(episodeUrl)}`;
//   const response = await fetch(url);
//   const episode: EpisodeDetails = await response.json();

//   return episode;
// };

export default async function Home() {
  try {
    return (
      <div>
        <Header />

        <div className='w-full flex flex-col items-center gap-2'>
          <PodcastDetails />
        </div>
      </div>
    );
  } catch (error: any) {
    return (
      <main className='flex min-h-screen flex-col items-center justify-between p-24'>
        <div className='flex flex-col gap-8 items-center justify-center'>
          <h1 className='text-4xl font-bold text-center'>Error</h1>
          <p className='text-lg text-center'>An error occurred. Please try again later.</p>
          {process.env.NODE_ENV === 'development' && <p>{error?.message}</p>}
        </div>
      </main>
    );
  }
}
