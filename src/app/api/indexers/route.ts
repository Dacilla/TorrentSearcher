import { NextRequest, NextResponse } from 'next/server';
import { getAllCaps, refreshAllCaps } from '@/lib/cache/capsCache';
import { validateSameOriginCsrf } from '@/lib/security/csrf';

export async function GET(): Promise<NextResponse> {
  const caps = await getAllCaps();
  return NextResponse.json(caps);
}

/** Cache-busting refresh is a state-changing op: require same-origin CSRF. */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const csrfError = validateSameOriginCsrf(req);
  if (csrfError) return csrfError;
  const caps = await refreshAllCaps();
  return NextResponse.json(caps);
}
