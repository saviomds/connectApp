export default function DiscoverLoading() {
  return (
    <div className="min-h-screen pt-nav flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Card skeleton */}
        <div className="glass rounded-3xl overflow-hidden animate-pulse">
          <div className="aspect-[3/4] bg-white/[0.04]" />
          <div className="p-5 flex flex-col gap-3">
            <div className="h-5 w-32 bg-white/[0.06] rounded-lg" />
            <div className="h-3.5 w-48 bg-white/[0.04] rounded-lg" />
            <div className="h-3 w-40 bg-white/[0.03] rounded-lg" />
          </div>
        </div>
        {/* Action buttons skeleton */}
        <div className="flex items-center justify-center gap-5 mt-6">
          {[44, 56, 44].map((s, i) => (
            <div key={i} className="rounded-full bg-white/[0.04] animate-pulse"
              style={{ width: s, height: s }} />
          ))}
        </div>
      </div>
    </div>
  )
}
