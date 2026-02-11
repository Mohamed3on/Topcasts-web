import { createClient } from '@/utils/supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams, origin } = req.nextUrl;
  const code = searchParams.get('code');
  const redirect = searchParams.get('redirect');

  try {
    if (code) {
      await supabase.auth.exchangeCodeForSession(code);
    }
  } catch (error) {
    console.log('Error exchanging code for session:', error);
  }

  // Validate redirect is a relative path to prevent open redirects
  if (redirect && redirect.startsWith('/') && !redirect.startsWith('//')) {
    return NextResponse.redirect(`${origin}${redirect}`);
  }

  return NextResponse.redirect(`${origin}/`);
}
