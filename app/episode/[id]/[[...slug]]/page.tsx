import { PodcastDetails } from '@/app/PodcastDetails';
import { EpisodeDetails } from '@/app/api/types';
import { getHost } from '@/app/utils';
import { notFound } from 'next/navigation';

type EpisodeDetailsResponse = EpisodeDetails & { error: string };

export const dynamic = 'force-dynamic';
async function getEpisodeDetails(episode_id: string): Promise<EpisodeDetailsResponse> {
  const response = await fetch(`${getHost()}/api/episode?episode_id=${episode_id}`);
  return response.json();
}

export default async function Page({ params }: { params: { id: string; slug: string } }) {
  const response = await getEpisodeDetails(params.id);

  if (response?.error) {
    notFound();
  }

  return <PodcastDetails episodeDetails={response} />;
}
