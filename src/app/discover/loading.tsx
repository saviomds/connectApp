export default function DiscoverLoading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center pt-nav-flush px-4 gap-6">
      {/* Card skeleton */}
      <div className="w-full max-w-sm aspect-[3/4] rounded-3xl bg-white/[0.04] animate-pulse" />

      {/* Action buttons skeleton */}
      <div className="flex items-center gap-5">
        <div className="w-12 h-12 rounded-full bg-white/[0.04] animate-pulse" />
        <div className="w-16 h-16 rounded-full bg-white/[0.06] animate-pulse" />
        <div className="w-12 h-12 rounded-full bg-white/[0.04] animate-pulse" />
      </div>
    </div>
  )
}
