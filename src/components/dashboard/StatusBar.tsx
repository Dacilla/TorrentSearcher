'use client';

import { TrackerStatus } from '@/types';

type ConfigState = {
  runtime: { mode: string; cache: string; writeProtection: string };
  checks: Record<string, { state: 'ok' | 'missing-config' | 'error' | 'skipped' }>;
};

interface Props {
  trackerStatuses: TrackerStatus[];
  totalIndexers: number;
  config: ConfigState | null;
}

export function StatusBar({ trackerStatuses, totalIndexers, config }: Props) {
  const up = trackerStatuses.filter((t) => t.state === 'done').length;
  const errs = trackerStatuses.filter((t) => t.state === 'error').length;
  const apiState = config?.checks?.jackett?.state ?? 'skipped';

  return (
    <footer className="ts-statusbar">
      <div className="ts-status-group">
        <span
          className="ts-status-dot"
          style={{ background: apiState === 'ok' ? '#10b981' : '#ef4444' }}
        />
        <span className="ts-status-k">API</span>
        <span className="ts-status-v">{apiState === 'ok' ? 'online' : apiState}</span>
      </div>
      <div className="ts-status-group">
        <span className="ts-status-k">Indexers</span>
        <span className="ts-status-v">{up}/{totalIndexers || '—'}</span>
        {errs > 0 && <span className="ts-status-err">{errs} error{errs > 1 ? 's' : ''}</span>}
      </div>
      <div className="ts-status-group">
        <span className="ts-status-k">Cache</span>
        <span className="ts-status-v">{config?.runtime?.cache ?? '—'}</span>
      </div>
      <div className="ts-status-group">
        <span className="ts-status-k">CSRF</span>
        <span className="ts-status-v">protected writes</span>
      </div>
      <div className="ts-spacer" />
      <div className="ts-status-group ts-status-right">
        <span className="ts-status-k">Mode</span>
        <span className="ts-status-v">{config?.runtime?.mode ?? 'self-hosted'}</span>
      </div>
      <div className="ts-status-group ts-status-right">
        <kbd>/</kbd>
        <span className="ts-status-v">focus search</span>
      </div>
    </footer>
  );
}
