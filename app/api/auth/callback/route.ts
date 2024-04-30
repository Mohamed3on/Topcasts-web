import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const { searchParams, origin } = req.nextUrl;
  const code = searchParams.get('code');

  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  }
  // TODO: implement redirect to the previous page
  return NextResponse.redirect(`${origin}/`);
}
