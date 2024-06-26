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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { createClient } from '@/utils/supabase/client';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, ThumbsDown, ThumbsUp } from 'lucide-react';
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
  rating: z.enum(['like', 'dislike'], {
    required_error: 'Please rate the episode',
  }),

  review_text: z.string().optional(),
});

export const ImportEpisodeUrl = ({
  onSuccessfulSubmit,
}: {
  onSuccessfulSubmit: () => void;
}) => {
  const supabase = createClient();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      episode_url: '',
      rating: 'like',
    },
  });

  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const { IconComponent, toggleIcon } = useClipboardIcon();

  const handleIconClick = async () => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      form.setValue('episode_url', clipboardText);
      toggleIcon();
    } catch (error) {
      toast('Clipboard access denied. Please paste manually.');
    }
  };

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    const accessToken = (await supabase.auth.getSession()).data.session
      ?.access_token;
    try {
      setIsLoading(true);
      const response = await fetch(`/api/episode`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          ...values,
          url: values.episode_url,
        }),
      });

      const data = await response.json();

      setIsLoading(false);
      toast.success('Episode saved successfully!');

      if (!data || data.error) {
        throw data.error;
      }
      router.push(`/episode/${data.id}/${data.slug}`);

      onSuccessfulSubmit();
    } catch (error) {
      toast.error(
        <div>
          <p>
            Error getting episode details. Are you sure this is a valid episode
            URL?
          </p>
          <p className="font-semibold">
            Hint: Only Apple Podcasts, Spotify, and Castro URLs are supported.
          </p>
        </div>,
      );
    }
  };

  return (
    <div>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="flex w-full flex-col items-center gap-7 p-7"
        >
          <FormField
            control={form.control}
            name="episode_url"
            render={({ field }) => (
              <FormItem className="w-full sm:w-1/2">
                <FormLabel>
                  Enter the Episode URL to save to your list
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      autoFocus
                      className="text-md  overflow-hidden pr-10 "
                      {...field}
                      placeholder="https://open.spotify.com/episode/4TVeJ7kvd9SqEKWGVZYDUU"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 transform transition duration-300 ease-in-out"
                      onClick={handleIconClick}
                    >
                      {/* paste does not work as expected on iPhone */}
                      {!navigator.userAgent.includes('iPhone') && (
                        <IconComponent />
                      )}
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
          <FormField
            control={form.control}
            name="rating"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="flex w-full items-center justify-center gap-4"
                  >
                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormControl>
                        <RadioGroupItem
                          className="flex items-center gap-1 text-slate-500 data-[state=checked]:border-green-500 data-[state=checked]:text-green-500"
                          value="like"
                        >
                          <ThumbsUp />
                          <span className="">Like</span>
                        </RadioGroupItem>
                      </FormControl>
                    </FormItem>

                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormControl>
                        <RadioGroupItem
                          className="flex items-center gap-1 text-slate-500 data-[state=checked]:border-red-500 data-[state=checked]:text-red-500"
                          value="dislike"
                        >
                          <ThumbsDown />
                          <span>Dislike</span>
                        </RadioGroupItem>
                      </FormControl>
                    </FormItem>
                  </RadioGroup>
                </FormControl>

                <FormMessage />
              </FormItem>
            )}
          ></FormField>

          <FormField
            control={form.control}
            name="review_text"
            render={({ field }) => (
              <FormItem className="h-auto w-full sm:w-1/3">
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="Write a review (optional)"
                  />
                </FormControl>

                <FormMessage />
              </FormItem>
            )}
          ></FormField>
          <LoaderButton isLoading={isLoading} className="group">
            <div className="flex items-center gap-1">
              <span>Add Episode</span>
              <ArrowRight className="h-4 w-4 translate-x-0 transform transition-transform duration-300 group-hover:translate-x-1" />
            </div>
          </LoaderButton>
        </form>
      </Form>
    </div>
  );
};
