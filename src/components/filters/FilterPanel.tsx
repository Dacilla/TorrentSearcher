'use client';

import { Resolution, VideoCodec, Source } from '@/types';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SortKey } from '@/hooks/useFilters';
import { ArrowUpDown, RotateCcw } from 'lucide-react';

interface Props {
  availableResolutions: Resolution[];
  availableCodecs: VideoCodec[];
  availableSources: Source[];
  selectedResolutions: Resolution[];
  selectedCodecs: VideoCodec[];
  selectedSources: Source[];
  freeleechOnly: boolean;
  minSeeders: number;
  freeleechCount: number;
  sort: SortKey;
  onToggleResolution: (r: Resolution) => void;
  onToggleCodec: (c: VideoCodec) => void;
  onToggleSource: (s: Source) => void;
  onFreeleechToggle: () => void;
  onMinSeedersChange: (n: number) => void;
  onSortChange: (s: SortKey) => void;
  onReset: () => void;
}

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'seeders', label: 'Seeders' },
  { key: 'date', label: 'Date' },
  { key: 'size', label: 'Size' },
  { key: 'resolution', label: 'Quality' },
];

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">{label}</p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function TogglePill({
  active,
  onClick,
  ariaLabel,
  children,
}: {
  active: boolean;
  onClick: () => void;
  ariaLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={ariaLabel}
      className={`rounded-lg border px-2.5 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300/60 ${
        active
          ? 'border-teal-300 bg-teal-300 text-zinc-950'
          : 'border-zinc-700 bg-transparent text-zinc-400 hover:border-zinc-500'
      }`}
    >
      {children}
    </button>
  );
}

export function FilterPanel({
  availableResolutions,
  availableCodecs,
  availableSources,
  selectedResolutions,
  selectedCodecs,
  selectedSources,
  freeleechOnly,
  minSeeders,
  freeleechCount,
  sort,
  onToggleResolution,
  onToggleCodec,
  onToggleSource,
  onFreeleechToggle,
  onMinSeedersChange,
  onSortChange,
  onReset,
}: Props) {
  const hasActiveFilters =
    selectedResolutions.length > 0 ||
    selectedCodecs.length > 0 ||
    selectedSources.length > 0 ||
    freeleechOnly ||
    minSeeders > 0;

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
      {/* Sort */}
      <div>
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <ArrowUpDown size={11} /> Sort By
        </p>
        <div className="flex gap-1.5 flex-wrap">
          {SORT_OPTIONS.map((opt) => (
            <TogglePill
              key={opt.key}
              active={sort === opt.key}
              onClick={() => onSortChange(opt.key)}
              ariaLabel={`Sort by ${opt.label}`}
            >
              {opt.label}
            </TogglePill>
          ))}
        </div>
      </div>

      {/* Resolution */}
      {availableResolutions.length > 0 && (
        <FilterGroup label="Resolution">
          {availableResolutions.map((r) => (
            <TogglePill
              key={r}
              active={selectedResolutions.includes(r)}
              onClick={() => onToggleResolution(r)}
              ariaLabel={`Filter ${r}`}
            >
              {r}
            </TogglePill>
          ))}
        </FilterGroup>
      )}

      {/* Codec */}
      {availableCodecs.length > 0 && (
        <FilterGroup label="Codec">
          {availableCodecs.map((c) => (
            <TogglePill
              key={c}
              active={selectedCodecs.includes(c)}
              onClick={() => onToggleCodec(c)}
              ariaLabel={`Filter ${c}`}
            >
              {c}
            </TogglePill>
          ))}
        </FilterGroup>
      )}

      {/* Source */}
      {availableSources.length > 0 && (
        <FilterGroup label="Source">
          {availableSources.map((s) => (
            <TogglePill
              key={s}
              active={selectedSources.includes(s)}
              onClick={() => onToggleSource(s)}
              ariaLabel={`Filter ${s}`}
            >
              {s}
            </TogglePill>
          ))}
        </FilterGroup>
      )}

      {/* Min Seeders */}
      <div>
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
          Min Seeders: <span className="text-zinc-300">{minSeeders}</span>
        </p>
        <Slider
          aria-label="Minimum seeders"
          min={0}
          max={100}
          step={5}
          value={[minSeeders]}
          onValueChange={(vals) => onMinSeedersChange(Array.isArray(vals) ? vals[0] : vals)}
          className="w-full"
        />
      </div>

      {/* Freeleech */}
      {freeleechCount > 0 && (
        <div className="flex items-center gap-2">
          <Checkbox
            id="freeleech"
            checked={freeleechOnly}
            onCheckedChange={onFreeleechToggle}
          />
          <label htmlFor="freeleech" className="text-sm text-zinc-300 cursor-pointer">
            Freeleech only
            <Badge className="ml-1.5 bg-yellow-600/20 text-yellow-400 border-yellow-600/40 text-xs">
              {freeleechCount}
            </Badge>
          </label>
        </div>
      )}

      {/* Reset */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
          className="w-full text-zinc-500 hover:text-zinc-300 text-xs gap-1.5 h-7"
        >
          <RotateCcw size={11} /> Reset Filters
        </Button>
      )}
    </div>
  );
}
