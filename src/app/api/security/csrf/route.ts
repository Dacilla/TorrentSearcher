import { buildCsrfResponse } from '@/lib/security/csrf';

export async function GET() {
  return buildCsrfResponse();
}

