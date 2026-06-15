export default function VideoCardSkeleton() {
  return (
    <article className="rounded-xl overflow-hidden bg-white shadow-md dark:bg-dark-navy border border-gray-200 dark:border-gray-700 flex flex-col h-full w-full">
      <div className="relative aspect-video skeleton-shimmer">
        <div className="absolute top-2 right-2 h-11 w-11 rounded-full skeleton-shimmer" />
        <div className="absolute bottom-2 right-2 h-5 w-12 rounded skeleton-shimmer" />
      </div>
      <div className="p-4 flex flex-col flex-1 gap-3">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-full skeleton-shimmer flex-shrink-0" />
          <div className="h-4 w-28 rounded skeleton-shimmer flex-1 min-w-0" />
        </div>
        <div className="space-y-2">
          <div className="h-5 w-full rounded skeleton-shimmer" />
          <div className="h-5 w-3/4 rounded skeleton-shimmer" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-3.5 w-24 rounded skeleton-shimmer flex-shrink-0" />
          <div className="h-3.5 w-20 rounded skeleton-shimmer flex-shrink-0" />
        </div>
        <div className="flex flex-wrap gap-1.5 mt-auto">
          <div className="h-5 w-16 rounded-full skeleton-shimmer" />
          <div className="h-5 w-20 rounded-full skeleton-shimmer" />
          <div className="h-5 w-18 rounded-full skeleton-shimmer" />
        </div>
      </div>
    </article>
  );
}
