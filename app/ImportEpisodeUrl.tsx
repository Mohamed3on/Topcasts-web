'use client';
import { LoaderButton } from '@/app/LoaderButton';
import { useClipboardIcon } from '@/app/hooks/useClipboardIcon';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';
import { toast } from 'sonner';

export const ImportEpisodeUrl = () => {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { IconComponent, toggleIcon } = useClipboardIcon();

  const handleIconClick = async () => {
    const clipboardText = await navigator.clipboard.readText();
    setUrl(clipboardText);
    toggleIcon();
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      const response = await fetch(`/api/episode`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();
      setIsLoading(false);
      if (!data || data.error) {
        throw data.error;
      }
      router.push(`/episode/${data.id}/${data.slug}`);
      setUrl('');
    } catch (error) {
      toast(
        <div>
          <p>
            Error getting episode details. Are you sure this is a valid episode
            URL?
          </p>
          <p className="font-semibold">
            Hint: Only Apple Podcasts, Spotify, and Castro URLs are supported.
          </p>
        </div>,
        {
          className: 'bg-red-500 text-white',
        },
      );
    }
  };

  return (
    <div>
      <form
        onSubmit={handleSubmit}
        className="flex w-full flex-col items-center gap-8 p-8"
      >
        <div className="relative w-full">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="text-md w-full overflow-hidden pr-10"
            name="url"
            placeholder="Enter a podcast episode URL"
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 transform transition duration-300 ease-in-out"
            onClick={handleIconClick}
          >
            <IconComponent />
          </button>
        </div>
        <LoaderButton isLoading={isLoading}>Add Episode</LoaderButton>
      </form>
    </div>
  );
};
