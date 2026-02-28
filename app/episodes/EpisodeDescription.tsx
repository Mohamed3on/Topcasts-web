// Description comes from trusted podcast RSS feeds stored in our database
export const EpisodeDescription = ({
  description,
}: {
  description: string;
}) => {
  if (!description) return null;

  return (
    <div
      className="break-words"
      dangerouslySetInnerHTML={{ __html: description }}
    />
  );
};

export default EpisodeDescription;
