import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = createClient();

  const { searchParams } = request.nextUrl;
  const searchQuery = searchParams.get('q') || '';

  if (!searchQuery) {
    return NextResponse.json(
      { error: 'Invalid search query' },
      { status: 400 },
    );
  }

  const { data, error } = await supabase.rpc('search_episodes', {
    // replace space with + for supabase API
    search_query: searchQuery.replace(/ /g, '+'),
  });

  if (error || !data) {
    console.error('Error fetching search results:', error);
    return NextResponse.json(
      { error: `Failed to fetch search results: ${error?.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json(data);
}
