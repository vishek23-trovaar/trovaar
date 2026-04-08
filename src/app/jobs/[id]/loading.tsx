export default function Loading() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-pulse">
      {/* Back link */}
      <div className="h-4 bg-slate-200 rounded w-24 mb-6" />
      {/* Title and badges */}
      <div className="h-8 bg-slate-200 rounded w-2/3 mb-3" />
      <div className="flex gap-2 mb-6">
        <div className="h-6 bg-slate-200 rounded-full w-20" />
        <div className="h-6 bg-slate-200 rounded-full w-24" />
      </div>
      {/* Main card */}
      <div className="bg-slate-100 rounded-xl p-6 space-y-4 mb-6">
        <div className="h-4 bg-slate-200 rounded w-full" />
        <div className="h-4 bg-slate-200 rounded w-5/6" />
        <div className="h-4 bg-slate-200 rounded w-4/6" />
        <div className="h-4 bg-slate-200 rounded w-3/6" />
      </div>
      {/* Map placeholder */}
      <div className="h-48 bg-slate-200 rounded-xl mb-6" />
      {/* Bids section */}
      <div className="h-6 bg-slate-200 rounded w-32 mb-4" />
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-slate-100 rounded-xl p-4 flex items-center gap-4">
            <div className="h-10 w-10 bg-slate-200 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-slate-200 rounded w-1/3" />
              <div className="h-4 bg-slate-200 rounded w-1/4" />
            </div>
            <div className="h-8 bg-slate-200 rounded w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
