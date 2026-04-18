import { NextRequest, NextResponse } from 'next/server';
import { getSeriesStatus } from '@/lib/sonarr/client';
import { parseRequiredPositiveInt } from '@/lib/http/validation';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const tvdbId = req.nextUrl.searchParams.get('tvdbId');
  const parsed = parseRequiredPositiveInt(tvdbId, 'tvdbId');
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const info = await getSeriesStatus(parsed.value);
  return NextResponse.json(info);
}
