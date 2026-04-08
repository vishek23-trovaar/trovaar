export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-pulse">
      {/* Page title */}
      <div className="h-8 bg-slate-200 rounded w-48 mb-8" />
      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-slate-100 rounded-xl p-5 space-y-2">
            <div className="h-4 bg-slate-200 rounded w-2/3" />
            <div className="h-7 bg-slate-200 rounded w-1/3" />
          </div>
        ))}
      </div>
      {/* Chart placeholder */}
      <div className="bg-slate-100 rounded-xl p-6 mb-8">
        <div className="h-5 bg-slate-200 rounded w-40 mb-4" />
        <div className="h-48 bg-slate-200 rounded" />
      </div>
      {/* Table skeleton */}
      <div className="bg-slate-100 rounded-xl p-6">
        <div className="h-5 bg-slate-200 rounded w-36 mb-4" />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex gap-4">
              <div className="h-4 bg-slate-200 rounded w-1/4" />
              <div className="h-4 bg-slate-200 rounded w-1/6" />
              <div className="h-4 bg-slate-200 rounded w-1/5" />
              <div className="h-4 bg-slate-200 rounded w-1/6" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
