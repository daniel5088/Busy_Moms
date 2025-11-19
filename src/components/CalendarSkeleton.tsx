// Alvaros Skeletons

export function CalendarSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <div className="h-12 bg-gray-200 rounded-lg w-48 animate-pulse"></div>

      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="grid grid-cols-7 gap-2 mb-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={`day-${i}`} className="h-8 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={`date-${i}`} className="h-20 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div className="h-16 bg-gray-200 rounded-lg animate-pulse"></div>
        <div className="h-16 bg-gray-200 rounded-lg animate-pulse"></div>
        <div className="h-16 bg-gray-200 rounded-lg animate-pulse"></div>
        <div className="h-16 bg-gray-200 rounded-lg animate-pulse"></div>
      </div>
    </div>
  );
}
