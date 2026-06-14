export default function VideoCardSkeleton() {
  return (
    <article className="rounded-xl overflow-hidden bg-white shadow-md dark:bg-dark-navy border border-gray-200 dark:border-gray-700 flex flex-col h-full">
      <div className="relative aspect-video skeleton-shimmer" />
      <div className="p-4 flex flex-col flex-1 gap-3">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-full skeleton-shimmer flex-shrink-0" />
          <div className="h-4 w-24 rounded skeleton-shimmer" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-full rounded skeleton-shimmer" />
          <div className="h-4 w-3/4 rounded skeleton-shimmer" />
        </div>
        <div className="flex gap-3">
          <div className="h-3 w-20 rounded skeleton-shimmer" />
          <div className="h-3 w-16 rounded skeleton-shimmer" />
        </div>
        <div className="flex gap-1.5 mt-auto">
          <div className="h-5 w-16 rounded-full skeleton-shimmer" />
          <div className="h-5 w-20 rounded-full skeleton-shimmer" />
        </div>
      </div>
    </article>
  );
}
