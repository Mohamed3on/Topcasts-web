import { PodcastDetails } from '@/app/PodcastDetails';
import { EpisodeDetails } from '@/app/api/types';
import { getHost } from '@/app/utils';

async function getEpisodeDetails(episode_id: string): Promise<EpisodeDetails> {
  const response = await fetch(`${getHost()}/api/episode?episode_id=${episode_id}`);
  return response.json();
}

export default async function Page({ params }: { params: { id: string; slug: string } }) {
  const episode = await getEpisodeDetails(params.id);

  return <PodcastDetails episodeDetails={episode} />;
}
