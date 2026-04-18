'use client';

import { useState } from 'react';
import { TrackerStatus } from '@/types';
import { Loader2, CheckCircle2, XCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  statuses: TrackerStatus[];
  total: number;
  completed: number;
  isComplete: boolean;
}

export function TrackerProgress({ statuses, total, completed, isComplete }: Props) {
  const [expanded, setExpanded] = useState(true);

  if (statuses.length === 0) return null;

  const errors = statuses.filter((s) => s.state === 'error').length;

  return (
    <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-zinc-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {!isComplete && <Loader2 size={14} className="animate-spin text-zinc-400" />}
          {isComplete && <CheckCircle2 size={14} className="text-green-500" />}
          <span className="text-sm text-zinc-300">
            {isComplete
              ? `${total} tracker${total !== 1 ? 's' : ''} searched`
              : `Searching ${completed}/${total} trackers…`}
          </span>
          {errors > 0 && (
            <span className="text-xs text-red-400 bg-red-600/15 px-1.5 py-0.5 rounded-full border border-red-600/30">
              {errors} error{errors !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        {expanded ? <ChevronUp size={14} className="text-zinc-500" /> : <ChevronDown size={14} className="text-zinc-500" />}
      </button>

      {/* Tracker rows */}
      {expanded && (
        <div className="border-t border-zinc-800 divide-y divide-zinc-800/50 max-h-48 overflow-y-auto">
          {statuses.map((s) => (
            <div key={s.indexerId} className="flex items-center gap-3 px-4 py-2">
              {/* Status icon */}
              <div className="shrink-0 w-4">
                {s.state === 'loading' && <Loader2 size={12} className="animate-spin text-zinc-500" />}
                {s.state === 'done' && <CheckCircle2 size={12} className="text-green-500" />}
                {s.state === 'error' && <XCircle size={12} className="text-red-500" />}
              </div>

              {/* Name */}
              <span className="flex-1 text-xs text-zinc-300 truncate">{s.indexerName}</span>

              {/* Result count */}
              {s.resultCount !== undefined && (
                <span className="text-xs text-zinc-500">{s.resultCount} result{s.resultCount !== 1 ? 's' : ''}</span>
              )}

              {/* Duration */}
              {s.durationMs !== undefined && (
                <span className="text-xs text-zinc-600 w-14 text-right">
                  {s.durationMs < 1000 ? `${s.durationMs}ms` : `${(s.durationMs / 1000).toFixed(1)}s`}
                </span>
              )}

              {/* Error */}
              {s.error && (
                <span className="text-xs text-red-500 truncate max-w-32" title={s.error}>
                  {s.error}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
