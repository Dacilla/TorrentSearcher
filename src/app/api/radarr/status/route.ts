import { NextRequest, NextResponse } from 'next/server';
import { getMovieStatus } from '@/lib/radarr/client';
import { parseRequiredPositiveInt } from '@/lib/http/validation';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const tmdbId = req.nextUrl.searchParams.get('tmdbId');
  const parsed = parseRequiredPositiveInt(tmdbId, 'tmdbId');
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const info = await getMovieStatus(parsed.value);
  return NextResponse.json(info);
}
