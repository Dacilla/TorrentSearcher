'use client';

import { TorrentResult, KNOWN_GOOD_GROUPS } from '@/types';
import { scoreTorrent } from '@/lib/results/scoring';
import { I, RES_BG, SRC_CLR } from './icons';
import { fmtBytes, fmtDate, fmtNum } from './helpers';

interface Props {
  result: TorrentResult | null;
  onClose: () => void;
}

export function Inspector({ result, onClose }: Props) {
  if (!result) {
    return (
      <aside className="ts-inspector ts-inspector-empty">
        <div>
          <div className="ts-insp-empty-icon">{I.info}</div>
          <div className="ts-insp-empty-title">Release inspector</div>
          <div className="ts-insp-empty-sub">
            Click any row to see the magnet link, hash, source mirrors and quality breakdown.
          </div>
        </div>
      </aside>
    );
  }

  const ri = result.releaseInfo;
  const score = Math.min(100, scoreTorrent(result));
  const resBg = RES_BG[ri.resolution] ?? '#71717a';
  const srcClr = SRC_CLR[ri.source] ?? '#71717a';
  const group = ri.releaseGroup ?? '';
  const isKnown = KNOWN_GOOD_GROUPS.has(group);

  const breakdown = [
    {
      k: 'Resolution',
      v: ri.resolution,
      s: ri.resolution === '2160p' ? 35 : ri.resolution === '1080p' ? 28 : ri.resolution === '720p' ? 18 : 8,
      max: 35,
    },
    {
      k: 'Source',
      v: ri.source,
      s: ri.source === 'Remux' ? 18 : ri.source === 'BluRay' ? 16 : ri.source === 'WEB-DL' ? 14 : ri.source === 'WEBRip' ? 10 : 8,
      max: 18,
    },
    {
      k: 'Codec',
      v: ri.codec,
      s: ri.codec === 'AV1' ? 10 : (ri.codec === 'HEVC' || ri.codec === 'x265') ? 9 : ri.codec === 'x264' ? 7 : 2,
      max: 10,
    },
    {
      k: 'Seeders',
      v: fmtNum(result.seeders),
      s: Math.min(25, Math.round(Math.log10(Math.max(result.seeders, 0) + 1) * 10)),
      max: 25,
    },
    {
      k: 'Group',
      v: group || '—',
      s: isKnown ? 6 : 0,
      max: 6,
    },
  ];

  const copyHash = () => {
    if (result.infoHash) navigator.clipboard.writeText(result.infoHash).catch(() => {});
  };

  return (
    <aside className="ts-inspector">
      <div className="ts-insp-head">
        <span className="ts-insp-kicker">Release inspector</span>
        <button className="ts-iconbtn" onClick={onClose} aria-label="Close inspector">
          {I.x}
        </button>
      </div>

      {/* Score + title */}
      <div className="ts-insp-title">
        <div
          className="ts-insp-score-big"
          style={{ '--v': score } as React.CSSProperties}
        >
          <span className="ts-insp-score-val">{score}</span>
          <span className="ts-insp-score-lbl">SCORE</span>
        </div>
        <div>
          <div className="ts-insp-rel-name">{result.title}</div>
          <div className="ts-insp-rel-tags">
            <span className="ts-tag ts-tag-res" style={{ '--c': resBg } as React.CSSProperties}>
              {ri.resolution}
            </span>
            <span className="ts-tag ts-tag-src" style={{ '--c': srcClr } as React.CSSProperties}>
              {ri.source}
            </span>
            <span className="ts-tag ts-tag-codec">{ri.codec}</span>
            {ri.hdr && <span className="ts-tag ts-tag-hdr">HDR</span>}
            {ri.dolbyVision && <span className="ts-tag ts-tag-dv">DV</span>}
            {ri.isFreeleech && <span className="ts-fl-pill">FL</span>}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="ts-insp-actions">
        {result.magnetUrl ? (
          <a href={result.magnetUrl} className="ts-btn ts-btn-primary ts-btn-lg">
            {I.magnet} Open magnet
          </a>
        ) : (
          <span className="ts-btn ts-btn-primary ts-btn-lg" style={{ opacity: 0.4, cursor: 'not-allowed' }}>
            {I.magnet} No magnet
          </span>
        )}
        <a href={result.downloadUrl} className="ts-btn ts-btn-ghost" download>
          {I.download} .torrent
        </a>
        {result.infoHash && (
          <button className="ts-btn ts-btn-ghost" onClick={copyHash} title="Copy info hash">
            {I.copy} Hash
          </button>
        )}
      </div>

      {/* Stats grid */}
      <div className="ts-insp-grid">
        <div><span>Size</span><b>{fmtBytes(result.size)}</b></div>
        <div><span>Seeders</span><b className="ts-up">{fmtNum(result.seeders)}</b></div>
        <div><span>Leechers</span><b className="ts-dn">{fmtNum(result.leechers)}</b></div>
        <div><span>Grabs</span><b>{result.grabs != null ? fmtNum(result.grabs) : '—'}</b></div>
        <div><span>Group</span><b>{group || '—'}</b></div>
        <div><span>Published</span><b>{fmtDate(result.publishDate)}</b></div>
      </div>

      {/* Quality breakdown */}
      <div className="ts-insp-section">
        <div className="ts-insp-sh">Quality breakdown</div>
        {breakdown.map((b) => (
          <div className="ts-bk" key={b.k}>
            <span className="ts-bk-k">{b.k}</span>
            <span className="ts-bk-v">{b.v}</span>
            <div className="ts-bk-bar">
              <div className="ts-bk-fill" style={{ width: `${(b.s / b.max) * 100}%` }} />
            </div>
            <span className="ts-bk-s">+{b.s}</span>
          </div>
        ))}
      </div>

      {/* Alternate sources */}
      {(result.duplicateSources?.length ?? 0) > 0 && (
        <div className="ts-insp-section">
          <div className="ts-insp-sh">
            Alternate sources ({(result.duplicateSources?.length ?? 0) + 1})
          </div>
          <div className="ts-alt">
            <div className="ts-alt-row is-primary">
              <span className="ts-alt-name">{result.indexerName}</span>
              <span className="ts-alt-stat">
                <span className="ts-up">↑{fmtNum(result.seeders)}</span>
                {' · '}
                <span className="ts-dn">↓{fmtNum(result.leechers)}</span>
              </span>
              <span className="ts-alt-flag">primary</span>
            </div>
            {result.duplicateSources?.map((s, i) => (
              <div className="ts-alt-row" key={s.indexerId ?? s.indexerName ?? `source-${i}`}>
                <span className="ts-alt-name">{s.indexerName}</span>
                <span className="ts-alt-stat">
                  <span className="ts-up">↑{fmtNum(s.seeders)}</span>
                </span>
                {s.magnetUrl ? (
                  <a href={s.magnetUrl} className="ts-alt-mag" title="Open magnet">
                    {I.magnet}
                  </a>
                ) : (
                  <span className="ts-alt-mag" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info hash */}
      {result.infoHash && (
        <div className="ts-insp-section">
          <div className="ts-insp-sh">Identifiers</div>
          <div className="ts-id">
            <span>Info hash</span>
            <code>{result.infoHash}</code>
          </div>
        </div>
      )}
    </aside>
  );
}
