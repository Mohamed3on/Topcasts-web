import { Database } from '@/app/api/types/supabase';
import { CookieOptions, createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const getSupabaseServerClient = () => {
  const cookieStore = cookies();

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: cookieStore as CookieOptions,
    }
  );

  return supabase;
};

export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = getSupabaseServerClient();

  const { searchParams } = request.nextUrl;
  const searchQuery = searchParams.get('q') || '';

  if (!searchQuery) {
    return NextResponse.json({ error: 'Invalid search query' }, { status: 400 });
  }

  const { data, error } = await supabase.rpc('search_episodes_by_terms', {
    // replace space with + for supabase API
    search_query: searchQuery.replace(/ /g, '+'),
  });

  if (error || !data) {
    console.error('Error fetching search results:', error);
    return NextResponse.json(
      { error: `Failed to fetch search results: ${error?.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}
