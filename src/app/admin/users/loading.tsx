export default function AdminUsersLoading() {
  return (
    <div className="animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="h-7 w-20 bg-white/[0.06] rounded-xl mb-1.5" />
          <div className="h-3 w-28 bg-white/[0.03] rounded" />
        </div>
      </div>
      <div className="flex gap-3 mb-6">
        <div className="flex-1 h-11 bg-white/[0.04] rounded-xl" />
        <div className="flex gap-2">
          {[60, 72, 72, 80, 90].map((w, i) => (
            <div key={i} className="h-11 rounded-xl bg-white/[0.04]" style={{ width: w }} />
          ))}
        </div>
      </div>
      <div className="glass rounded-2xl overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-white/[0.04] last:border-0">
            <div className="w-9 h-9 rounded-full bg-white/[0.06]" />
            <div className="flex-1 flex flex-col gap-2">
              <div className="h-3.5 bg-white/[0.06] rounded" style={{ width: `${30 + (i % 4) * 10}%` }} />
              <div className="h-2.5 bg-white/[0.03] rounded" style={{ width: `${40 + (i % 3) * 8}%` }} />
            </div>
            <div className="hidden sm:flex gap-1.5">
              <div className="h-5 w-14 bg-white/[0.04] rounded-full" />
              <div className="h-5 w-10 bg-white/[0.04] rounded-full" />
            </div>
            <div className="hidden sm:block h-3 w-20 bg-white/[0.03] rounded" />
            <div className="w-8 h-8 rounded-xl bg-white/[0.04]" />
          </div>
        ))}
      </div>
    </div>
  )
}
