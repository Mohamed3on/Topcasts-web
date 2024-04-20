import { EpisodeDetails } from '@/app/api/episode/route';

import { getTokens } from 'next-firebase-auth-edge';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { clientConfig, serverConfig } from '../config';
import { PodcastDetails } from '@/app/PodcastDetails';
import LogOut from '@/app/LogOutButton';

export const dynamic = 'force-dynamic';

const getHost = () => {
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3000';
  } else {
    return 'https://topcasts.vercel.app';
  }
};

const getEpisodeDetails = async (episodeUrl: string) => {
  const url = `${getHost()}/api/episode?url=${encodeURIComponent(episodeUrl)}`;
  const response = await fetch(url);
  const episode: EpisodeDetails = await response.json();

  return episode;
};

export default async function Home() {
  try {
    // const episodeDetails = await getEpisodeDetails(
    //   'https://podcasts.apple.com/de/podcast/419-sam-altman-openai-gpt-5-sora-board-saga-elon-musk/id1434243584?i=1000649593201&l=en-GB'
    // );

    const episodeDetails = await getEpisodeDetails(
      'https://podcasts.apple.com/us/podcast/mark-zuckerberg-llama-3-open-sourcing-%2410b-models-caeser/id1516093381?i=1000652877239'
    );

    const tokens = await getTokens(cookies(), {
      apiKey: clientConfig.apiKey,
      cookieName: serverConfig.cookieName,
      cookieSignatureKeys: serverConfig.cookieSignatureKeys,
      serviceAccount: serverConfig.serviceAccount,
    });

    if (!tokens) {
      notFound();
    }

    return (
      <div>
        <LogOut />
        <PodcastDetails episodeDetails={episodeDetails} email={tokens.decodedToken.email} />
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
