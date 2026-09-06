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

    // Validate against server-provided allowlists (never trust client paths/IDs).
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
      folderPath = folderPath ?? folders[0]?.path ?? '/tv';
      // Defaults must also be allowlisted when the server returned lists.
      if (profiles.length > 0 && !validProfileIds.has(profileId)) {
        return NextResponse.json({ error: 'Invalid qualityProfileId' }, { status: 400 });
      }
      if (folders.length > 0 && !validFolders.has(folderPath!)) {
        return NextResponse.json({ error: 'Invalid rootFolderPath' }, { status: 400 });
      }
    }

    await addSeries(parsedTvdbId.value, profileId, folderPath!);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[/api/sonarr/add]', e);
    return NextResponse.json({ error: 'Failed to add series' }, { status: 500 });
  }
}
