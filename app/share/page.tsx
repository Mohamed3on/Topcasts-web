import { ShareForm } from './ShareForm';

export default async function SharePage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string; rating?: string }>;
}) {
  const { url, rating } = await searchParams;

  if (!url) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-8">
        <div className="text-center">
          <h1 className="mb-2 text-xl font-bold">Missing URL</h1>
          <p className="text-muted-foreground">
            Please provide an episode URL via the <code>?url=</code> parameter.
          </p>
        </div>
      </main>
    );
  }

  const validRating =
    rating === 'like' || rating === 'dislike' ? rating : undefined;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <ShareForm url={url} rating={validRating} />
    </main>
  );
}
