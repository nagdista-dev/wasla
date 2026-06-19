export default function PostCardSkeleton() {
  return (
    <article className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200 dark:bg-dark-navy dark:ring-gray-700">
      <div className="h-1 w-full skeleton-shimmer" />
      <div className="p-5 sm:p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg skeleton-shimmer flex-shrink-0" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-4 w-1/3 rounded skeleton-shimmer" />
            <div className="h-3 w-1/4 rounded skeleton-shimmer" />
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-4 w-full rounded skeleton-shimmer" />
          <div className="h-4 w-5/6 rounded skeleton-shimmer" />
          <div className="h-4 w-4/6 rounded skeleton-shimmer" />
        </div>
        <div className="flex gap-1.5">
          <div className="h-5 w-16 rounded-full skeleton-shimmer" />
          <div className="h-5 w-20 rounded-full skeleton-shimmer" />
        </div>
        <div className="h-32 rounded-xl skeleton-shimmer" />
        <div className="flex gap-1.5 pt-1">
          <div className="h-5 w-16 rounded-full skeleton-shimmer" />
          <div className="h-5 w-20 rounded-full skeleton-shimmer" />
          <div className="h-5 w-14 rounded-full skeleton-shimmer" />
        </div>
      </div>
    </article>
  );
}
