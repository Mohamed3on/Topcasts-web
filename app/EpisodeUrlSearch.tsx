'use client';
import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export const EpisodeUrlSearch = () => {
  const router = useRouter();
  const [url, setUrl] = React.useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const response = await fetch(`/api/episode`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });
    const data = await response.json();
    if (!data || data.error) {
      toast.error('Failed to add episode details');
    }
    router.push(`/episode/${data.id}/${data.slug}`);
    setUrl('');
  };
  return (
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
  );
};
