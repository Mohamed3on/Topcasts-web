import { getHost } from '@/app/utils';
import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const { searchParams, origin } = req.nextUrl;
  console.log('🚀 ~ GET ~ origin:', origin);
  const code = searchParams.get('code');

  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  }
  // TODO: implement redirect to the previous page
  return NextResponse.redirect(`${getHost()}/episode/1`);
}
