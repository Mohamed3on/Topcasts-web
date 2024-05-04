'use client';

import DOMPurify from 'dompurify';

export const EpisodeDescription = ({
  description,
}: {
  description: string;
}) => {
  return (
    <span
      className="break-words"
      dangerouslySetInnerHTML={{
        __html: DOMPurify.sanitize(description),
      }}
    ></span>
  );
};

export default EpisodeDescription;
