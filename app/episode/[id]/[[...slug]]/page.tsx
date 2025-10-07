import { Episode } from '@/app/Episode';
import { formatUrls } from '@/app/api/episode/utils';
import { EpisodeDetails } from '@/app/api/types';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  getCachedEpisodeDetails,
  getCachedEpisodeMetadata,
} from '@/utils/supabase/server-cache';

type Props = {
  params: Promise<{ id: string }>;
};

async function getEpisodeDetails(episode_id: string): Promise<EpisodeDetails> {
  if (!episode_id) {
    return notFound();
  }

  const data = await getCachedEpisodeDetails(episode_id);

  if (!data) {
    return notFound();
  }

  return {
    ...data,
    urls: formatUrls(data.podcast_episode_url),
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const data = await getCachedEpisodeMetadata(id);

  return {
    title: data?.episode_name,
    openGraph: {
      images: [data?.image_url || ''],
    },
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ id: string; slug: string }>;
}) {
  const { id } = await params;
  const response = await getEpisodeDetails(id);

  return <Episode episodeDetails={response} />;
}
