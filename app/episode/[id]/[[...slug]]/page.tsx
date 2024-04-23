import { EpisodeDetails } from '@/app/api/types';

const getHost = () => {
  return process.env.NEXT_PUBLIC_HOST || 'http://localhost:3000';
};
async function getEpisodeDetails(episode_id: string): Promise<EpisodeDetails> {
  const response = await fetch(`${getHost()}/api/episode?episode_id=${episode_id}`);
  return response.json();
}

export default async function Page({ params }: { params: { id: string; slug: string } }) {
  const episode = await getEpisodeDetails(params.id);

  return (
    <div>
      <div className='w-full flex flex-col items-center gap-2'>
        <div>
          <h1>{episode.episode_name}</h1>
          <p>{episode.description}</p>
          <p>{episode.slug}</p>
        </div>
      </div>
    </div>
  );
}
