export default function AdminMatchesLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-7 w-56 bg-white/[0.06] rounded-xl mb-2" />
      <div className="h-4 w-80 bg-white/[0.04] rounded-lg mb-7" />
      <div className="flex gap-1 mb-6 p-1 w-fit glass rounded-2xl">
        {[80, 96, 80].map((w, i) => (
          <div key={i} className="h-9 rounded-xl bg-white/[0.04]" style={{ width: w }} />
        ))}
      </div>
      <div className="flex gap-3 mb-5">
        <div className="flex-1 h-9 bg-white/[0.04] rounded-xl" />
        <div className="w-9 h-9 bg-white/[0.04] rounded-xl" />
        <div className="w-36 h-9 bg-white/[0.06] rounded-xl" />
      </div>
      <div className="glass rounded-2xl overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-5 py-3.5 border-b border-white/[0.04] last:border-0">
            <div className="w-8 h-8 rounded-full bg-white/[0.06]" />
            <div className="flex-1 flex flex-col gap-1.5">
              <div className="h-3.5 bg-white/[0.06] rounded-lg w-32" />
              <div className="h-3 bg-white/[0.03] rounded-lg w-24" />
            </div>
            <div className="w-6 h-6 bg-white/[0.04] rounded-full" />
            <div className="flex-1 flex flex-col gap-1.5">
              <div className="h-3.5 bg-white/[0.06] rounded-lg w-32" />
              <div className="h-3 bg-white/[0.03] rounded-lg w-24" />
            </div>
            <div className="w-7 h-7 bg-white/[0.04] rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  )
}
