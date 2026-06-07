export default function AdminMessagesLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-7 w-52 bg-white/[0.06] rounded-xl mb-2" />
      <div className="h-4 w-96 bg-white/[0.04] rounded-lg mb-6" />
      <div className="h-16 glass rounded-2xl mb-6" />
      <div className="glass rounded-2xl overflow-hidden" style={{ height: 480 }}>
        <div className="flex h-full">
          <div className="w-72 border-r border-white/[0.06] p-3 flex flex-col gap-2">
            <div className="h-8 bg-white/[0.04] rounded-xl mb-1" />
            <div className="flex gap-2">
              <div className="flex-1 h-7 bg-white/[0.04] rounded-lg" />
              <div className="flex-1 h-7 bg-white/[0.04] rounded-lg" />
            </div>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-start gap-2 py-2">
                <div className="w-9 h-8 rounded-full bg-white/[0.06] shrink-0" />
                <div className="flex-1 flex flex-col gap-1.5">
                  <div className="h-3 bg-white/[0.06] rounded-lg w-3/4" />
                  <div className="h-2.5 bg-white/[0.03] rounded-lg w-full" />
                </div>
              </div>
            ))}
          </div>
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-white/[0.04]" />
          </div>
        </div>
      </div>
    </div>
  )
}
