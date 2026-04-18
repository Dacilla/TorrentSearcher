import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

export const CSRF_COOKIE = 'torrent_searcher_csrf';
export const CSRF_HEADER = 'x-csrf-token';

export function createCsrfToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

export function buildCsrfResponse(): NextResponse {
  const token = createCsrfToken();
  const response = NextResponse.json({ csrfToken: token });
  response.cookies.set(CSRF_COOKIE, token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 8,
  });
  return response;
}

export function validateSameOriginCsrf(req: NextRequest): NextResponse | null {
  const origin = req.headers.get('origin');
  if (origin && origin !== req.nextUrl.origin) {
    return NextResponse.json({ error: 'Cross-origin write blocked' }, { status: 403 });
  }

  const token = req.headers.get(CSRF_HEADER);
  const cookie = req.cookies.get(CSRF_COOKIE)?.value;
  if (!token || !cookie || token !== cookie) {
    return NextResponse.json({ error: 'Write token missing or expired' }, { status: 403 });
  }

  return null;
}

