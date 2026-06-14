export default function ChannelCardSkeleton() {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-200 dark:bg-dark-navy dark:ring-gray-700">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-full skeleton-shimmer flex-shrink-0" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-4 w-2/3 rounded skeleton-shimmer" />
          <div className="h-3 w-1/3 rounded skeleton-shimmer" />
        </div>
        <div className="h-9 w-9 rounded-lg skeleton-shimmer flex-shrink-0" />
      </div>
      <div className="flex gap-1.5 mt-3">
        <div className="h-5 w-16 rounded-full skeleton-shimmer" />
        <div className="h-5 w-20 rounded-full skeleton-shimmer" />
        <div className="h-5 w-14 rounded-full skeleton-shimmer" />
      </div>
      <div className="flex gap-2 border-t border-gray-100 dark:border-gray-700/50 pt-3 mt-3">
        <div className="h-8 w-14 rounded-lg skeleton-shimmer" />
        <div className="h-8 w-16 rounded-lg skeleton-shimmer" />
      </div>
    </div>
  );
}
