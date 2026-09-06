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

    const [profiles, folders] = await Promise.all([getQualityProfiles(), getRootFolders()]);
    const validProfileIds = new Set(profiles.map((p) => p.id));
    const validFolders = new Set(folders.map((f) => f.path));

    let profileId = qualityProfileId;
    let folderPath = rootFolderPath;

    if (profileId !== undefined) {
      const parsed = parseRequiredPositiveInt(profileId, 'qualityProfileId');
      if (!parsed.ok || !validProfileIds.has(parsed.value)) {
        return NextResponse.json({ error: 'Invalid qualityProfileId' }, { status: 400 });
      }
      profileId = parsed.value;
    }
    if (folderPath !== undefined && !validFolders.has(folderPath)) {
      return NextResponse.json({ error: 'Invalid rootFolderPath' }, { status: 400 });
    }

    if (profileId === undefined || folderPath === undefined) {
      profileId = profileId ?? profiles[0]?.id ?? 1;
      folderPath = folderPath ?? folders[0]?.path ?? '/movies';
      if (profiles.length > 0 && !validProfileIds.has(profileId)) {
        return NextResponse.json({ error: 'Invalid qualityProfileId' }, { status: 400 });
      }
      if (folders.length > 0 && !validFolders.has(folderPath!)) {
        return NextResponse.json({ error: 'Invalid rootFolderPath' }, { status: 400 });
      }
    }

    await addMovie(parsedTmdbId.value, profileId!, folderPath!);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[/api/radarr/add]', e);
    return NextResponse.json({ error: 'Failed to add movie' }, { status: 500 });
  }
}
