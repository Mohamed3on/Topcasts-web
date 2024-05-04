'use client';

import DOMPurify from 'dompurify';
import { useEffect, useState } from 'react';

export const EpisodeDescription = ({
  description,
}: {
  description: string;
}) => {
  const [sanitizedHtml, setSanitizedHtml] = useState('');

  useEffect(() => {
    const domPurify = DOMPurify(window);
    const cleanHtml = domPurify.sanitize(description);
    setSanitizedHtml(cleanHtml);
  }, [description]);

  if (!sanitizedHtml) return null;

  return (
    <span
      className="break-words"
      dangerouslySetInnerHTML={{
        __html: sanitizedHtml,
      }}
    ></span>
  );
};

export default EpisodeDescription;
