'use client';

import { useState, useEffect } from 'react';

type ServiceCheck = { state: 'ok' | 'missing-config' | 'error' | 'skipped'; message?: string };

export type ConfigState = {
  services: Array<{ name: string; label: string; configured: boolean; missing: string[] }>;
  checks: Record<string, ServiceCheck>;
  runtime: { mode: string; cache: string; writeProtection: string };
};

export function useConfig(): ConfigState | null {
  const [config, setConfig] = useState<ConfigState | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/config?check=true', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled && d) setConfig(d as ConfigState); })
      .catch(() => {});

    return () => { cancelled = true; };
  }, []);

  return config;
}
