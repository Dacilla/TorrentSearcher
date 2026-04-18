import { describe, expect, it } from 'vitest';
import { detectContentType } from './contentType';

describe('detectContentType', () => {
  it('detects SxxExx TV queries and strips episode tokens', () => {
    expect(detectContentType('Breaking Bad S03E07')).toEqual({
      type: 'tv',
      season: 3,
      episode: 7,
      cleanQuery: 'Breaking Bad',
    });
  });

  it('detects season pack queries', () => {
    expect(detectContentType('The Bear Season 2')).toMatchObject({
      type: 'tv',
      season: 2,
      cleanQuery: 'The Bear',
    });
  });
});

