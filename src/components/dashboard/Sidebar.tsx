'use client';

import { I } from './icons';

type ServiceCheck = { state: 'ok' | 'missing-config' | 'error' | 'skipped'; message?: string };

interface Props {
  collapsed: boolean;
  onToggle: () => void;
  checks?: Record<string, ServiceCheck>;
}

function dotColor(state?: ServiceCheck['state']): string {
  if (state === 'ok') return '#10b981';
  if (state === 'error') return '#ef4444';
  if (state === 'missing-config') return '#f59e0b';
  return '#52525b';
}

export function Sidebar({ collapsed, onToggle, checks }: Props) {
  const groups = [
    {
      label: 'Library',
      items: [
        { id: 'search',   icon: I.search,   label: 'Search',    active: true },
        { id: 'queue',    icon: I.zap,      label: 'Live feed' },
        { id: 'saved',    icon: I.bookmark, label: 'Watchlist', badge: null },
        { id: 'hist',     icon: I.history,  label: 'History' },
      ],
    },
    {
      label: 'Services',
      items: [
        { id: 'jackett', icon: I.server, label: 'Jackett', dot: dotColor(checks?.jackett?.state) },
        { id: 'sonarr',  icon: I.tv,     label: 'Sonarr',  dot: dotColor(checks?.sonarr?.state)  },
        { id: 'radarr',  icon: I.film,   label: 'Radarr',  dot: dotColor(checks?.radarr?.state)  },
        { id: 'tmdb',    icon: I.info,   label: 'TMDB',    dot: dotColor(checks?.tmdb?.state)    },
      ],
    },
    {
      label: 'System',
      items: [
        { id: 'trackers', icon: I.sliders, label: 'Trackers' },
        { id: 'cache',    icon: I.shield,  label: 'Cache'    },
        { id: 'settings', icon: I.cog,     label: 'Settings' },
      ],
    },
  ];

  return (
    <aside className={`ts-sidebar${collapsed ? ' is-collapsed' : ''}`}>
      <div className="ts-brand">
        <div className="ts-brand-mark">{I.brand}</div>
        <div className="ts-brand-text">
          <div className="ts-brand-name">Torrent<span>Searcher</span></div>
          <div className="ts-brand-sub">self-hosted · v2</div>
        </div>
        <button className="ts-collapse" onClick={onToggle} aria-label="Toggle sidebar">
          {collapsed ? I.chevR : I.chevL}
        </button>
      </div>

      <nav className="ts-nav">
        {groups.map((g) => (
          <div className="ts-nav-group" key={g.label}>
            <div className="ts-nav-label">{g.label}</div>
            {g.items.map((it) => {
              const active = 'active' in it && it.active;
              const badge = 'badge' in it ? it.badge : undefined;
              const dot = 'dot' in it ? it.dot : undefined;
              return (
                <button
                  key={it.id}
                  type="button"
                  className={`ts-nav-item${active ? ' is-active' : ''}`}
                  aria-label={it.label}
                  aria-current={active ? 'page' : undefined}
                  title={collapsed ? it.label : undefined}
                >
                  <span className="ts-nav-icon">{it.icon}</span>
                  <span className="ts-nav-text">{it.label}</span>
                  {badge != null && (
                    <span className="ts-nav-badge">{badge}</span>
                  )}
                  {dot && (
                    <span className="ts-nav-dot" style={{ background: dot }} />
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="ts-side-foot">
        <div className="ts-kbar">
          <span className="ts-kbar-keys">
            <kbd>⌘</kbd><kbd>K</kbd>
          </span>
          <span>Command menu</span>
        </div>
      </div>
    </aside>
  );
}
