import { Episode } from '@/app/Episode';
import { formatUrls } from '@/app/api/episode/utils';
import { EpisodeDetails } from '@/app/api/types';
import { createClient } from '@/utils/supabase/ssr';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';

type Props = {
  params: { id: string };
};

async function getEpisodeDetails(episode_id: string): Promise<EpisodeDetails> {
  const supabase = createClient();
  if (!episode_id) {
    return notFound();
  }

  const { data, error } = await supabase
    .from('episode_with_rating_data')
    .select(
      `
      *,
      podcast_episode_url (url, type)
    `,
    )
    .eq('id', episode_id)
    .single();

  if (error || !data) {
    console.error('Error fetching episode details:', error);
    return notFound();
  }

  return {
    ...data,
    urls: formatUrls(data.podcast_episode_url),
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = createClient();

  const { data } = await supabase
    .from('podcast_episode')
    .select('episode_name, image_url')
    .eq('id', params.id)
    .single();

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
  params: { id: string; slug: string };
}) {
  const response = await getEpisodeDetails(params.id);

  return <Episode episodeDetails={response} />;
}
