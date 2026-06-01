export default function AdminReportsLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-7 w-52 bg-white/[0.06] rounded-xl mb-2" />
      <div className="h-3.5 w-72 bg-white/[0.03] rounded mb-7" />
      <div className="flex gap-2 mb-6">
        {[80, 80, 92].map((w, i) => (
          <div key={i} className="h-9 rounded-xl bg-white/[0.04]" style={{ width: w }} />
        ))}
      </div>
      <div className="glass rounded-2xl overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-5 py-3 border-b border-white/[0.04] last:border-0">
            <div className="w-8 h-8 rounded-full bg-white/[0.06]" />
            <div className="flex-1 flex flex-col gap-1.5">
              <div className="h-3.5 bg-white/[0.06] rounded" style={{ width: `${35 + (i % 3) * 12}%` }} />
              <div className="h-2.5 bg-white/[0.03] rounded" style={{ width: `${50 + (i % 4) * 8}%` }} />
            </div>
            <div className="h-3 w-14 bg-white/[0.03] rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
