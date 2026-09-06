'use client';

import { useEffect, useReducer } from 'react';
import { ArrInfo, MediaInfo } from '@/types';

type State = {
  arrInfo: ArrInfo | null;
  error: string | null;
};

type Action =
  | { type: 'start' }
  | { type: 'loaded'; data: ArrInfo }
  | { type: 'error' }
  | { type: 'reset' }
  | { type: 'setError'; message: string | null };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'start':
      return { ...state, arrInfo: { status: 'loading' }, error: null };
    case 'loaded':
      return { ...state, arrInfo: action.data, error: null };
    case 'error':
      return { ...state, arrInfo: { status: 'error' }, error: null };
    case 'reset':
      return { arrInfo: null, error: null };
    case 'setError':
      return { ...state, error: action.message };
    default:
      return state;
  }
}

const initialState: State = { arrInfo: null, error: null };

export function useArrInfo(mediaInfo: MediaInfo | null) {
  const [state, dispatch] = useReducer(reducer, initialState);
  // Deps on stable IDs, not object identity (avoids refetch loops).
  const tmdbId = mediaInfo?.tmdbId;
  const tvdbId = mediaInfo?.tvdbId;
  const contentType = mediaInfo?.contentType;

  useEffect(() => {
    if (!mediaInfo) {
      dispatch({ type: 'reset' });
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    const isTv = contentType === 'tv';

    dispatch({ type: 'start' });

    const url = isTv && tvdbId
      ? `/api/sonarr/status?tvdbId=${tvdbId}`
      : !isTv && tmdbId
        ? `/api/radarr/status?tmdbId=${tmdbId}`
        : null;

    if (!url) {
      dispatch({ type: 'error' });
      return;
    }

    fetch(url, { signal: controller.signal, cache: 'no-store' })
      .then((r) => {
        if (!r.ok) throw new Error(`status ${r.status}`);
        return r.json();
      })
      .then((d) => { if (!cancelled) dispatch({ type: 'loaded', data: d as ArrInfo }); })
      .catch((e) => {
        if (cancelled) return;
        if (e instanceof DOMException && e.name === 'AbortError') return;
        dispatch({ type: 'error' });
      });

    return () => { cancelled = true; controller.abort(); };
  }, [mediaInfo, tmdbId, tvdbId, contentType]);

  return {
    arrInfo: state.arrInfo,
    error: state.error,
    setError: (message: string | null) => dispatch({ type: 'setError', message }),
    setArrInfo: (info: ArrInfo | null) => {
      if (info) dispatch({ type: 'loaded', data: info });
      else dispatch({ type: 'reset' });
    },
  };
}
