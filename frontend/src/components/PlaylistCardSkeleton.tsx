export default function PlaylistCardSkeleton() {
  return (
    <div className="flex flex-col h-full rounded-xl bg-white shadow-sm ring-1 ring-gray-200 dark:bg-dark-navy dark:ring-gray-700 min-w-0">
      <div className="aspect-video w-full overflow-hidden rounded-t-xl skeleton-shimmer" />
      <div className="flex flex-1 flex-col p-4 gap-3">
        <div className="space-y-2">
          <div className="h-4 w-full rounded skeleton-shimmer" />
          <div className="h-4 w-2/3 rounded skeleton-shimmer" />
        </div>
        <div className="h-3 w-1/2 rounded skeleton-shimmer" />
        <div className="space-y-1">
          <div className="h-3 w-full rounded skeleton-shimmer" />
          <div className="h-3 w-4/5 rounded skeleton-shimmer" />
        </div>
        <div className="flex gap-1.5 mt-auto">
          <div className="h-5 w-16 rounded-full skeleton-shimmer" />
          <div className="h-5 w-20 rounded-full skeleton-shimmer" />
        </div>
        <div className="flex gap-2 border-t border-gray-100 dark:border-gray-700/50 pt-3">
          <div className="h-8 w-16 rounded-lg skeleton-shimmer" />
          <div className="h-8 w-14 rounded-lg skeleton-shimmer" />
          <div className="h-8 w-14 rounded-lg skeleton-shimmer" />
        </div>
      </div>
    </div>
  );
}
