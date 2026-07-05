// Description comes from trusted podcast RSS feeds stored in our database
export const EpisodeDescription = ({
  description,
}: {
  description: string;
}) => {
  if (!description) return null;

  return (
    <div
      className="[overflow-wrap:anywhere] [&_iframe]:max-w-full [&_img]:h-auto [&_img]:max-w-full"
      dangerouslySetInnerHTML={{ __html: description }}
    />
  );
};

export default EpisodeDescription;
