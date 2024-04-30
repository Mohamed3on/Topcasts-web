'use client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React from 'react';
import { toast } from 'sonner';

export const ImportEpisodeUrl = () => {
  const router = useRouter();
  const [url, setUrl] = React.useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const response = await fetch(`/api/episode`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });
      const data = await response.json();
      if (!data || data.error) {
        throw data.error;
      }
      router.push(`/episode/${data.id}/${data.slug}`);
      setUrl('');
    } catch (error) {
      toast(
        <div>
          <p>Error getting episode details. Are you sure this is a valid episode URL?</p>
          <p className='font-semibold'>
            Hint: Only Apple Podcasts, Spotify, and Castro URLs are supported.
          </p>
        </div>,
        {
          className: 'bg-red-500 text-white',
        }
      );
    }
  };
  return (
    <div>
      <form onSubmit={handleSubmit} className='flex flex-col items-center gap-8 w-full p-8'>
        <div className='relative h-10 w-full'>
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className='pl-10 pr-3 py-2 text-md w-full border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-[#6E23DD] focus:border-transparent'
            name='url'
            placeholder='enter a podcast episode URL'
          ></Input>
          <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 z-10' />
        </div>

        <Button type='submit'>Get Episode Details</Button>
      </form>
    </div>
  );
};
