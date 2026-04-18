import { NextRequest, NextResponse } from 'next/server';
import { addMovie, getQualityProfiles, getRootFolders } from '@/lib/radarr/client';
import { parseRequiredPositiveInt } from '@/lib/http/validation';
import { validateSameOriginCsrf } from '@/lib/security/csrf';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const csrfError = validateSameOriginCsrf(req);
  if (csrfError) return csrfError;

  try {
    const { tmdbId, qualityProfileId, rootFolderPath } = (await req.json()) as {
      tmdbId: number;
      qualityProfileId?: number;
      rootFolderPath?: string;
    };

    const parsedTmdbId = parseRequiredPositiveInt(tmdbId, 'tmdbId');
    if (!parsedTmdbId.ok) {
      return NextResponse.json({ error: parsedTmdbId.error }, { status: parsedTmdbId.status });
    }

    let profileId = qualityProfileId;
    let folderPath = rootFolderPath;

    if (!profileId || !folderPath) {
      const profiles = await getQualityProfiles();
      profileId = profileId ?? profiles[0]?.id ?? 1;

      const folders = await getRootFolders();
      folderPath = folderPath ?? folders[0]?.path ?? '/movies';
    }

    await addMovie(parsedTmdbId.value, profileId!, folderPath!);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
