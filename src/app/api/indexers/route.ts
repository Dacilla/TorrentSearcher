import { NextRequest, NextResponse } from 'next/server';
import { getAllCaps, refreshAllCaps } from '@/lib/cache/capsCache';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const refresh = req.nextUrl.searchParams.get('refresh') === 'true';
  const caps = refresh ? await refreshAllCaps() : await getAllCaps();
  return NextResponse.json(caps);
}
