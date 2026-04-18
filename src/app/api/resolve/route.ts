import { NextRequest, NextResponse } from 'next/server';
import { searchMedia } from '@/lib/tmdb/client';
import { detectContentType } from '@/lib/detection/contentType';
import { ContentType, MediaInfo } from '@/types';
import { parseContentType } from '@/lib/http/validation';

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const { query, contentType } = (await req.json()) as { query: string; contentType?: ContentType };
    if (!query?.trim()) {
      return NextResponse.json({ error: 'query required' }, { status: 400 });
    }

    const detected = detectContentType(query);
    const hintType = parseContentType(contentType) !== 'unknown'
      ? parseContentType(contentType)
      : detected.type;
    const mediaInfo: MediaInfo | null = await searchMedia(detected.cleanQuery, hintType);

    return NextResponse.json({
      detected,
      mediaInfo,
    });
  } catch (e) {
    console.error('[/api/resolve]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'resolve failed' },
      { status: 500 }
    );
  }
}
