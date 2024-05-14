import { PodcastDetails } from '@/app/PodcastDetails';
import { EpisodeDetails } from '@/app/api/types';
import { getHost } from '@/app/utils';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';

type Props = {
  params: { id: string };
};

type EpisodeDetailsResponse = EpisodeDetails & { error: string };

async function getEpisodeDetails(
  episode_id: string,
): Promise<EpisodeDetailsResponse> {
  const response = await fetch(
    `${getHost()}/api/episode?episode_id=${episode_id}`,
  );
  return response.json();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const episode = await getEpisodeDetails(params.id);

  return {
    title: episode.episode_name,
    openGraph: {
      images: [episode.image_url || ''],
    },
  };
}

export default async function Page({
  params,
}: {
  params: { id: string; slug: string };
}) {
  const response = await getEpisodeDetails(params.id);

  if (response?.error) {
    notFound();
  }

  return <PodcastDetails episodeDetails={response} />;
}
