// Ranking score for a user's podcasts: net likes weighted by like ratio.
// Higher score = higher rank. Shared by the statistics page and the episode
// page so both orderings stay identical.
type RankablePodcast = {
  review_difference: number;
  likes_count: number;
  dislikes_count: number;
};

const rankScore = (p: RankablePodcast) =>
  p.review_difference * (p.likes_count / (p.likes_count + p.dislikes_count));

export const byPodcastRank = (a: RankablePodcast, b: RankablePodcast) =>
  rankScore(b) - rankScore(a);
