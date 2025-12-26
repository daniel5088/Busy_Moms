export function DashboardSkeleton() {
  return (
    <div className="pb-20 bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* Header Skeleton */}
      <div className="bg-gradient-to-r from-rose-400 via-pink-400 to-orange-300 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 p-4 pb-6 dark:border-b dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="h-8 bg-white bg-opacity-20 rounded-lg w-48 animate-pulse"></div>
          <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full animate-pulse"></div>
        </div>

        <div className="bg-white bg-opacity-10 dark:bg-gray-900 dark:bg-opacity-50 rounded-xl p-3">
          <div className="flex items-center space-x-4">
            <div className="h-6 bg-white bg-opacity-20 rounded w-20 animate-pulse"></div>
            <div className="h-6 bg-white bg-opacity-20 rounded w-28 animate-pulse"></div>
            <div className="h-6 bg-white bg-opacity-20 rounded w-24 animate-pulse"></div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4 sm:p-6 sm:space-y-6">
        {/* Side-by-side Schedule Cards Skeleton */}
        <div className="flex gap-3 sm:gap-4">
          <div className="w-1/2 bg-gray-200 dark:bg-gray-800 rounded-xl h-80 animate-pulse"></div>
          <div className="w-1/2 bg-gray-200 dark:bg-gray-800 rounded-xl h-80 animate-pulse"></div>
        </div>

        {/* Quick Actions - 3x2 Grid Skeleton */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-24 rounded-xl bg-gray-200 dark:bg-gray-800 animate-pulse"
            ></div>
          ))}
        </div>

        {/* Smart Reminders Skeleton */}
        <div className="space-y-2">
          <div className="h-16 bg-gray-200 dark:bg-gray-900 rounded-lg animate-pulse"></div>
        </div>
      </div>
    </div>
  );
}
