export default function MessagesLoading() {
  return (
    <div className="min-h-screen pt-20 pb-24 md:pb-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-5">
          <div className="h-7 w-32 bg-white/[0.06] rounded-xl animate-pulse" />
          <div className="w-9 h-9 bg-white/[0.04] rounded-xl animate-pulse" />
        </div>
        <div className="h-11 w-full bg-white/[0.04] rounded-xl animate-pulse mb-4" />
        <div className="flex flex-col gap-1">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="glass rounded-2xl px-4 py-3.5 flex items-center gap-3 animate-pulse">
              <div className="w-12 h-12 rounded-full bg-white/[0.06] shrink-0" />
              <div className="flex-1 flex flex-col gap-2">
                <div className="h-3.5 bg-white/[0.06] rounded-lg" style={{ width: `${50 + (i % 3) * 15}%` }} />
                <div className="h-3 bg-white/[0.03] rounded-lg" style={{ width: `${65 + (i % 2) * 10}%` }} />
              </div>
              <div className="h-2.5 w-8 bg-white/[0.03] rounded shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
