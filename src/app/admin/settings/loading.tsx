export default function AdminSettingsLoading() {
  return (
    <div className="max-w-2xl animate-pulse">
      <div className="h-7 w-28 bg-white/[0.06] rounded-xl mb-2" />
      <div className="h-3.5 w-80 bg-white/[0.03] rounded mb-8" />
      <div className="glass rounded-2xl p-5 mb-5 h-40" />
      <div className="glass rounded-2xl p-6 mb-8">
        {[1, 2, 3].map(i => (
          <div key={i} className="mb-5 last:mb-0">
            <div className="h-3.5 w-28 bg-white/[0.06] rounded mb-2" />
            <div className="h-11 w-full bg-white/[0.04] rounded-xl" />
          </div>
        ))}
      </div>
      <div className="h-11 w-36 bg-white/[0.06] rounded-xl" />
    </div>
  )
}
