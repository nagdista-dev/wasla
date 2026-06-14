export default function VideoListSkeleton() {
  return (
    <article className="flex gap-4 rounded-xl bg-white shadow-sm ring-1 ring-gray-200 p-4 dark:bg-dark-navy dark:ring-gray-700">
      <div className="flex-0 w-48 aspect-video rounded-lg skeleton-shimmer" />
      <div className="flex-1 min-w-0 space-y-3 py-1">
        <div className="h-5 w-24 rounded-full skeleton-shimmer" />
        <div className="h-4 w-3/4 rounded skeleton-shimmer" />
        <div className="h-3 w-1/3 rounded skeleton-shimmer" />
      </div>
    </article>
  );
}
