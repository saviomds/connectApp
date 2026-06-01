export default function AdminLoading() {
  return (
    <div className="animate-pulse">
      <div className="flex items-center justify-between mb-7">
        <div>
          <div className="h-7 w-32 bg-white/[0.06] rounded-xl mb-2" />
          <div className="h-3 w-40 bg-white/[0.03] rounded-lg" />
        </div>
        <div className="h-9 w-24 bg-white/[0.04] rounded-xl" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="glass rounded-2xl p-5 h-28" />
        ))}
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="glass rounded-2xl h-56" />
        <div className="glass rounded-2xl h-56" />
      </div>
    </div>
  )
}
