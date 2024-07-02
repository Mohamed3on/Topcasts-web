let spotifyAccessToken: { token: string; expires_at: number };

const getSpotifyAccessToken = async () => {
  if (spotifyAccessToken && spotifyAccessToken.expires_at > Date.now()) {
    return spotifyAccessToken.token;
  }
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: process.env.SPOTIFY_CLIENT_ID!,
      client_secret: process.env.SPOTIFY_CLIENT_SECRET!,
    }),
  });

  const data = await response.json();

  spotifyAccessToken = {
    token: data.access_token,
    expires_at: Date.now() + data.expires_in * 1000,
  };
  console.log('🚀 spotifyAccessToken:', spotifyAccessToken);

  return spotifyAccessToken.token;
};

export const getSpotifyEpisodeData = async (episodeId: string) => {
  const token = await getSpotifyAccessToken();
  const response = await fetch(
    `https://api.spotify.com/v1/episodes/${episodeId}?market=US`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );
  const json = await response.json();

  return {
    episode_name: json.name,
    description: json.html_description,
    duration: json.duration_ms,
    image_url: json.images?.[0].url || json.show.images?.[0].url,
    release_date: json.release_date,
    show_description: json.show.description,
    spotify_show_id: json.show.id,
    podcast_name: json.show.name,
    artist_name: json.show.publisher,
  };
};
