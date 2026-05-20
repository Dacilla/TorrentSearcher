'use client';

import { TrackerStatus } from '@/types';
import { I } from './icons';

interface Props {
  trackerStatuses: TrackerStatus[];
  isSearching: boolean;
  totalIndexers: number;
}

export function TrackerRibbon({ trackerStatuses, isSearching, totalIndexers }: Props) {
  if (trackerStatuses.length === 0 && !isSearching) return null;

  const done = trackerStatuses.filter((t) => t.state === 'done').length;
  const loading = trackerStatuses.filter((t) => t.state === 'loading').length;
  const errors = trackerStatuses.filter((t) => t.state === 'error').length;
  const total = totalIndexers || trackerStatuses.length;
  const totalResults = trackerStatuses.reduce((a, t) => a + (t.resultCount ?? 0), 0);
  const avgMs = (() => {
    const withMs = trackerStatuses.filter((t) => t.durationMs != null);
    if (!withMs.length) return 0;
    return Math.round(withMs.reduce((a, t) => a + (t.durationMs ?? 0), 0) / withMs.length);
  })();
  const pct = total > 0 ? Math.round(((done + errors) / total) * 100) : 0;

  return (
    <section className="ts-tracker">
      <div className="ts-tracker-head">
        <div className="ts-tracker-title">
          <span className={`ts-tracker-state ${isSearching ? 'is-loading' : 'is-done'}`}>
            {isSearching ? <span className="ts-spin">{I.spin}</span> : I.check}
          </span>
          <span>
            {isSearching
              ? `Searching ${done + errors} of ${total} trackers`
              : `${total} trackers searched`}
          </span>
          <span className="ts-tracker-sub">
            · {totalResults} total hits{avgMs > 0 ? ` · avg ${avgMs}ms` : ''}
          </span>
        </div>
        <div className="ts-tracker-kpis">
          {done > 0 && (
            <span className="ts-kpi">
              <span className="ts-kpi-dot" style={{ background: '#10b981' }} />
              {done} done
            </span>
          )}
          {loading > 0 && (
            <span className="ts-kpi">
              <span className="ts-kpi-dot" style={{ background: '#14b8a6' }} />
              {loading} live
            </span>
          )}
          {errors > 0 && (
            <span className="ts-kpi">
              <span className="ts-kpi-dot" style={{ background: '#ef4444' }} />
              {errors} error{errors > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      <div className="ts-tracker-bar">
        <div className="ts-tracker-bar-fill" style={{ width: `${pct}%` }} />
      </div>

      <div className="ts-tracker-grid">
        {trackerStatuses.map((t) => {
          const sparkHeights = Array.from({ length: 14 }, (_, k) => {
            if (t.state === 'done') return 8 + (((t.resultCount ?? 0) * (k + 3)) % 22);
            if (t.state === 'loading') return 4 + (k % 5) * 2;
            return 3;
          });
          return (
            <div key={t.indexerId} className={`ts-trk is-${t.state}`}>
              <div className="ts-trk-top">
                <span className="ts-trk-ico">
                  {t.state === 'done' && I.check}
                  {t.state === 'loading' && <span className="ts-spin">{I.spin}</span>}
                  {t.state === 'error' && I.x}
                  {t.state === 'skipped' && I.dot}
                </span>
                <span className="ts-trk-name">{t.indexerName}</span>
                <span className="ts-trk-ms">
                  {t.durationMs != null
                    ? t.durationMs < 1000
                      ? `${t.durationMs}ms`
                      : `${(t.durationMs / 1000).toFixed(1)}s`
                    : '—'}
                </span>
              </div>
              <div className="ts-trk-bottom">
                <span className="ts-trk-count">
                  {t.state === 'loading' ? (
                    <span className="ts-trk-dots"><i /><i /><i /></span>
                  ) : t.state === 'error' ? (
                    t.error ?? 'failed'
                  ) : t.state === 'skipped' ? (
                    'n/a'
                  ) : (
                    `${t.resultCount ?? 0} hits`
                  )}
                </span>
                <div className="ts-trk-spark">
                  {sparkHeights.map((h, k) => (
                    <span key={k} style={{ height: `${h}px` }} />
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
