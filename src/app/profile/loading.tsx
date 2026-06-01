export default function ProfileLoading() {
  return (
    <div className="min-h-screen pt-20 pb-24 px-4 max-w-2xl mx-auto">
      {/* Avatar + name */}
      <div className="flex flex-col items-center gap-4 mb-8 animate-pulse">
        <div className="w-24 h-24 rounded-full bg-white/[0.06]" />
        <div className="h-6 w-40 bg-white/[0.06] rounded-xl" />
        <div className="h-3.5 w-56 bg-white/[0.04] rounded-lg" />
      </div>
      {/* Cards */}
      {[120, 80, 100].map((h, i) => (
        <div key={i} className="glass rounded-2xl p-5 mb-4 animate-pulse"
          style={{ height: h }} />
      ))}
    </div>
  )
}
