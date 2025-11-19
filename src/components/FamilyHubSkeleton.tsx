// Alvaros Skeletons

export function FamilyHubSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <div className="h-12 bg-gray-200 rounded-lg w-56 animate-pulse"></div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="h-64 bg-gray-200 rounded-xl animate-pulse"></div>
        <div className="h-64 bg-gray-200 rounded-xl animate-pulse"></div>
        <div className="h-64 bg-gray-200 rounded-xl animate-pulse"></div>
        <div className="h-64 bg-gray-200 rounded-xl animate-pulse"></div>
      </div>
    </div>
  );
}
