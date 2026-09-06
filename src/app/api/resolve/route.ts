import { NextRequest, NextResponse } from 'next/server';
import { searchMedia } from '@/lib/tmdb/client';
import { detectContentType } from '@/lib/detection/contentType';
import { ContentType, MediaInfo } from '@/types';
import { parseContentType } from '@/lib/http/validation';

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  try {
    const { query, contentType } = (body ?? {}) as { query?: unknown; contentType?: ContentType };
    if (typeof query !== 'string' || !query.trim()) {
      return NextResponse.json({ error: 'query required' }, { status: 400 });
    }
    if (query.length > 200) {
      return NextResponse.json({ error: 'query too long' }, { status: 400 });
    }

    const detected = detectContentType(query);
    const hintType = parseContentType(typeof contentType === 'string' ? contentType : undefined);
    const effectiveType = hintType !== 'unknown' ? hintType : detected.type;
    const mediaInfo: MediaInfo | null = await searchMedia(detected.cleanQuery, effectiveType);

    return NextResponse.json({
      detected,
      mediaInfo,
    });
  } catch (e) {
    console.error('[/api/resolve]', e);
    return NextResponse.json({ error: 'lookup failed' }, { status: 500 });
  }
}
