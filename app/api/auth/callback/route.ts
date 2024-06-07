import { createClient } from '@/utils/supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const { searchParams, origin } = req.nextUrl;
  const code = searchParams.get('code');

  try {
    if (code) {
      // TODO: implement redirect to the previous page
      await supabase.auth.exchangeCodeForSession(code);
    }
  } catch (error) {
    console.log('Error exchanging code for session:', error);
  }
  return NextResponse.redirect(`${origin}/`);
}
