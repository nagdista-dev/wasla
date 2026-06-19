export default function PostCardSkeleton() {
  return (
    <article className="flex flex-col overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200 dark:bg-dark-navy dark:ring-gray-700">
      <div className="h-1 w-full skeleton-shimmer" />
      <div className="aspect-video w-full skeleton-shimmer" />
      <div className="flex flex-1 flex-col p-4 sm:p-5 space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-full skeleton-shimmer flex-shrink-0" />
          <div className="h-4 w-1/3 rounded skeleton-shimmer" />
          <div className="ml-auto h-3 w-14 rounded skeleton-shimmer" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-full rounded skeleton-shimmer" />
          <div className="h-4 w-5/6 rounded skeleton-shimmer" />
          <div className="h-4 w-4/6 rounded skeleton-shimmer" />
          <div className="h-4 w-3/6 rounded skeleton-shimmer" />
        </div>
        <div className="flex gap-1.5 mt-auto">
          <div className="h-5 w-16 rounded-full skeleton-shimmer" />
          <div className="h-5 w-20 rounded-full skeleton-shimmer" />
        </div>
        <div className="flex gap-1.5 pt-1">
          <div className="h-5 w-16 rounded-full skeleton-shimmer" />
        </div>
      </div>
    </article>
  );
}
