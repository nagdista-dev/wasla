export default function VideoListSkeleton() {
  return (
    <article className="flex gap-4 rounded-xl bg-white shadow-sm ring-1 ring-gray-200 p-4 dark:bg-dark-navy dark:ring-gray-700">
      <div className="relative flex-0 w-44 aspect-video rounded-lg skeleton-shimmer overflow-hidden">
        <div className="absolute bottom-1.5 right-1.5 h-4 w-10 rounded skeleton-shimmer" />
      </div>
      <div className="flex-1 min-w-0 py-3 space-y-2">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full skeleton-shimmer flex-shrink-0" />
          <div className="h-3.5 w-24 rounded skeleton-shimmer flex-shrink-0" />
        </div>
        <div className="space-y-1.5">
          <div className="h-4 w-full rounded skeleton-shimmer" />
          <div className="h-4 w-3/4 rounded skeleton-shimmer" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-3.5 w-24 rounded skeleton-shimmer flex-shrink-0" />
          <div className="h-3.5 w-20 rounded skeleton-shimmer flex-shrink-0" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <div className="h-5 w-16 rounded-full skeleton-shimmer" />
          <div className="h-5 w-20 rounded-full skeleton-shimmer" />
          <div className="h-5 w-14 rounded-full skeleton-shimmer" />
        </div>
      </div>
    </article>
  );
}
