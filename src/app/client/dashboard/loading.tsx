export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-pulse">
      {/* Welcome heading */}
      <div className="h-8 bg-slate-200 rounded w-1/3 mb-6" />
      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-slate-100 rounded-xl p-4 space-y-2">
            <div className="h-4 bg-slate-200 rounded w-1/2" />
            <div className="h-6 bg-slate-200 rounded w-1/3" />
          </div>
        ))}
      </div>
      {/* Active jobs heading */}
      <div className="h-6 bg-slate-200 rounded w-40 mb-4" />
      {/* Job list */}
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-slate-100 rounded-xl p-5 flex items-center justify-between">
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-slate-200 rounded w-2/5" />
              <div className="h-4 bg-slate-200 rounded w-1/4" />
            </div>
            <div className="h-6 bg-slate-200 rounded-full w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
