export default function SettingsLoading() {
  return (
    <div className="min-h-screen pt-20 pb-24 px-4 max-w-2xl mx-auto animate-pulse">
      <div className="h-7 w-32 bg-white/[0.06] rounded-xl mb-8" />
      {[140, 80, 100, 60].map((h, i) => (
        <div key={i} className="glass rounded-2xl mb-4" style={{ height: h }} />
      ))}
    </div>
  )
}
