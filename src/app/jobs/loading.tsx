export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-pulse">
      {/* Search bar skeleton */}
      <div className="h-10 bg-slate-200 rounded-lg w-full mb-6" />
      {/* Category filters skeleton */}
      <div className="flex gap-2 mb-6">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-8 bg-slate-200 rounded-full w-24" />
        ))}
      </div>
      {/* Job cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-slate-100 rounded-xl p-6 space-y-3">
            <div className="h-4 bg-slate-200 rounded w-3/4" />
            <div className="h-4 bg-slate-200 rounded w-1/2" />
            <div className="h-4 bg-slate-200 rounded w-2/3" />
            <div className="flex gap-2 mt-2">
              <div className="h-5 bg-slate-200 rounded-full w-16" />
              <div className="h-5 bg-slate-200 rounded-full w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
