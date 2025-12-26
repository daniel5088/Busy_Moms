export function CalendarSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-orange-50 to-amber-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 pb-24">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-64 animate-pulse"></div>
          </div>
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-full w-44 animate-pulse"></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar Grid - Left Side */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg p-6 border border-gray-100 dark:border-gray-700">
              {/* Month Navigation */}
              <div className="flex items-center justify-between mb-6">
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg w-40 animate-pulse"></div>
                <div className="flex items-center space-x-3">
                  <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-xl w-20 animate-pulse"></div>
                  <div className="flex items-center space-x-1">
                    <div className="w-10 h-10 rounded-xl bg-gray-200 dark:bg-gray-700 animate-pulse"></div>
                    <div className="w-10 h-10 rounded-xl bg-gray-200 dark:bg-gray-700 animate-pulse"></div>
                  </div>
                </div>
              </div>

              {/* Weekday Headers */}
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-3"></div>

              {/* Calendar Rows */}
              <div className="space-y-2 mb-6">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={`week-${i}`} className="h-16 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse"></div>
                ))}
              </div>

              {/* Add Event Buttons */}
              <div className="flex gap-3">
                <div className="w-14 h-14 bg-gray-300 dark:bg-gray-600 rounded-xl animate-pulse flex-shrink-0"></div>
                <div className="flex-1 h-14 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse"></div>
              </div>
            </div>
          </div>

          {/* Events List - Right Side */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg p-6 border border-gray-100 dark:border-gray-700">
              <div className="h-7 bg-gray-200 dark:bg-gray-700 rounded w-32 animate-pulse mb-4"></div>
              <div className="space-y-3">
                <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-2xl animate-pulse"></div>
                <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-2xl animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
