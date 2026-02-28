import { revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret');
  if (secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: 'Invalid secret' }, { status: 401 });
  }

  const tag = request.nextUrl.searchParams.get('tag');
  if (!tag) {
    return NextResponse.json({ error: 'Missing tag' }, { status: 400 });
  }

  revalidateTag(tag);
  return NextResponse.json({ revalidated: tag });
}
