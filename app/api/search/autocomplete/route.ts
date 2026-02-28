import { Database } from '@/app/api/types/supabase';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const { data, error } = await supabase.rpc('search_episodes_autocomplete', {
    query: q,
  });

  if (error) {
    return NextResponse.json({ results: [] }, { status: 500 });
  }

  return NextResponse.json({ results: data });
}
