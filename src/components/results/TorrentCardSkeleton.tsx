import { Skeleton } from '@/components/ui/skeleton';

export function TorrentCardSkeleton() {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 space-y-3">
      <Skeleton className="h-4 w-full bg-zinc-800" />
      <Skeleton className="h-4 w-3/4 bg-zinc-800" />
      <div className="flex gap-2">
        <Skeleton className="h-5 w-16 rounded-full bg-zinc-800" />
        <Skeleton className="h-5 w-16 rounded-full bg-zinc-800" />
        <Skeleton className="h-5 w-20 rounded-full bg-zinc-800" />
      </div>
      <div className="flex gap-4">
        <Skeleton className="h-3 w-10 bg-zinc-800" />
        <Skeleton className="h-3 w-10 bg-zinc-800" />
        <Skeleton className="h-3 w-16 bg-zinc-800" />
      </div>
    </div>
  );
}
