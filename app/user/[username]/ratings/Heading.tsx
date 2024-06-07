import { createClient } from '@/utils/supabase/ssr';
import { notFound } from 'next/navigation';

export const Heading = async ({ username }: { username: string }) => {
  const supabase = createClient();

  const { data: userData } = await supabase
    .from('profiles')
    .select('id, name')
    .eq('username', username)
    .single();

  if (!userData) {
    notFound();
  }

  const name = userData.name;
  return (
    <h1 className="mb-8 mt-6 grid place-items-center text-2xl font-semibold">
      {name}&rsquo;s Rated Episodes
    </h1>
  );
};
