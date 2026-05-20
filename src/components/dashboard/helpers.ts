export function fmtBytes(b: number | undefined | null): string {
  if (!b) return '—';
  const u = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(b) / Math.log(1024));
  return (b / Math.pow(1024, i)).toFixed(i >= 3 ? 2 : 1) + ' ' + u[i];
}

export function fmtDate(iso: string): string {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  if (diff < 86400 * 30) return Math.floor(diff / 86400) + 'd ago';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
}

export function fmtNum(n: number): string {
  return n.toLocaleString();
}
