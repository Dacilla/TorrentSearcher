import { NextRequest, NextResponse } from 'next/server';
import { addSeries, getQualityProfiles, getRootFolders } from '@/lib/sonarr/client';
import { parseRequiredPositiveInt } from '@/lib/http/validation';
import { validateSameOriginCsrf } from '@/lib/security/csrf';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const csrfError = validateSameOriginCsrf(req);
  if (csrfError) return csrfError;

  try {
    const { tvdbId, qualityProfileId, rootFolderPath } = (await req.json()) as {
      tvdbId: number;
      qualityProfileId?: number;
      rootFolderPath?: string;
    };

    const parsedTvdbId = parseRequiredPositiveInt(tvdbId, 'tvdbId');
    if (!parsedTvdbId.ok) {
      return NextResponse.json({ error: parsedTvdbId.error }, { status: parsedTvdbId.status });
    }

    let profileId = qualityProfileId;
    let folderPath = rootFolderPath;

    if (!profileId || !folderPath) {
      const profiles = await getQualityProfiles();
      profileId = profileId ?? profiles[0]?.id ?? 1;
      const folders = await getRootFolders();
      folderPath = folderPath ?? folders[0]?.path ?? '/tv';
    }

    await addSeries(parsedTvdbId.value, profileId, folderPath!);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
