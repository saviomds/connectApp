export default function MatchesLoading() {
  return (
    <main className="min-h-screen pt-24 pb-12 px-6 max-w-5xl mx-auto">
      <div className="mb-10">
        <div className="h-4 w-28 bg-white/[0.04] rounded-lg animate-pulse mb-3" />
        <div className="h-8 w-40 bg-white/[0.06] rounded-xl animate-pulse mb-2" />
        <div className="h-3.5 w-64 bg-white/[0.03] rounded-lg animate-pulse" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="glass rounded-3xl overflow-hidden animate-pulse">
            <div className="aspect-[4/5] bg-white/[0.04]" />
            <div className="p-4 flex flex-col gap-2">
              <div className="h-4 w-32 bg-white/[0.06] rounded-lg" />
              <div className="h-3 w-24 bg-white/[0.04] rounded-lg" />
              <div className="h-11 w-full bg-white/[0.04] rounded-2xl mt-1" />
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
