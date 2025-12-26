// Alvaros Skeletons

export function DashboardSkeleton() {
  return (
    <div className="pb-20 bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* Header Skeleton */}
      <div className="bg-gradient-to-r from-rose-400 via-pink-400 to-orange-300 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 text-white p-4 pb-6 dark:border-b dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="h-8 bg-white bg-opacity-20 rounded-lg w-48 animate-pulse"></div>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full animate-pulse"></div>
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full animate-pulse"></div>
          </div>
        </div>

        {/* Mini Stats Skeleton */}
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
          {/* Daily Schedule */}
          <div className="w-1/2">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-3 sm:mb-4 animate-pulse"></div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm h-80 p-3 sm:p-4">
              <div className="space-y-3">
                <div className="p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20 animate-pulse"></div>
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full animate-pulse"></div>
                    </div>
                  </div>
                </div>
                <div className="p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20 animate-pulse"></div>
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full animate-pulse"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Weekly Schedule */}
          <div className="w-1/2">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-36 mb-3 sm:mb-4 animate-pulse"></div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm h-80 p-3 sm:p-4">
              <div className="space-y-3">
                <div className="p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24 animate-pulse"></div>
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full animate-pulse"></div>
                    </div>
                  </div>
                </div>
                <div className="p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24 animate-pulse"></div>
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full animate-pulse"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions - 3x2 Grid Skeleton */}
        <div>
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-3 sm:mb-4 animate-pulse"></div>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="p-3 sm:p-4 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm"
              >
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-xl mb-2 sm:mb-3 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 mb-1 animate-pulse"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16 animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Smart Reminders Skeleton */}
        <div>
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-36 mb-3 sm:mb-4 animate-pulse"></div>
          <div className="space-y-2">
            {[...Array(2)].map((_, i) => (
              <div
                key={i}
                className="flex items-center space-x-3 p-3 bg-yellow-50 dark:bg-yellow-900 rounded-lg border border-yellow-200 dark:border-yellow-700"
              >
                <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-yellow-200 dark:bg-yellow-800 rounded w-3/4 animate-pulse"></div>
                  <div className="h-3 bg-yellow-200 dark:bg-yellow-800 rounded w-1/2 animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
