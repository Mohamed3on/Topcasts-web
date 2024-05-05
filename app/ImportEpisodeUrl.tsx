'use client';
import { LoaderButton } from '@/app/LoaderButton';
import { determineType } from '@/app/api/episode/utils';
import { useClipboardIcon } from '@/app/hooks/useClipboardIcon';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

const formSchema = z.object({
  episode_url: z.string().refine(
    (url) => {
      try {
        const type = determineType(url);
        return !!type;
      } catch (e) {
        return false;
      }
    },
    `Please enter a valid Apple Podcasts/Spotify/Castro episode URL.
    Valid URLs look like:
    - https://podcasts.apple.com/us/podcast/episode-title/id123456789?i=1000000000000
    - https://open.spotify.com/episode/episode-id
    - https://castro.fm/episode/episode-id
      `,
  ),
});

export const ImportEpisodeUrl = ({
  onSuccessfulSubmit,
}: {
  onSuccessfulSubmit?: () => void;
}) => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      episode_url: '',
    },
  });

  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const { IconComponent, toggleIcon } = useClipboardIcon();

  const handleIconClick = async () => {
    const clipboardText = await navigator.clipboard.readText();
    form.setValue('episode_url', clipboardText);
    toggleIcon();
  };

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/episode`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: values.episode_url }),
      });

      const data = await response.json();
      setIsLoading(false);
      if (!data || data.error) {
        throw data.error;
      }
      router.push(`/episode/${data.id}/${data.slug}`);
      onSuccessfulSubmit?.();
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
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="flex w-full flex-col items-center gap-8 p-8"
        >
          <FormField
            control={form.control}
            name="episode_url"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormLabel>Enter the Episode URL to add to Topcasts</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      className="text-md w-full overflow-hidden pr-10"
                      {...field}
                      placeholder="https://open.spotify.com/episode/4TVeJ7kvd9SqEKWGVZYDUU"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 transform transition duration-300 ease-in-out"
                      onClick={handleIconClick}
                    >
                      <IconComponent />
                    </button>
                  </div>
                </FormControl>
                <FormDescription>
                  Valid Episode URLs include Apple Podcasts, Spotify, and
                  Castro.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          ></FormField>
          <LoaderButton isLoading={isLoading}>Add Episode</LoaderButton>
        </form>
      </Form>
    </div>
  );
};
