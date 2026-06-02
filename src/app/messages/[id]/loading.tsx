export default function ChatLoading() {
  return (
    <div className="flex flex-col h-screen pt-nav">
      {/* Header skeleton */}
      <div className="glass border-b border-white/[0.06] px-4 py-3 flex items-center gap-3 shrink-0 animate-pulse">
        <div className="w-8 h-8 rounded-xl bg-white/[0.06]" />
        <div className="w-10 h-10 rounded-full bg-white/[0.06]" />
        <div className="flex flex-col gap-1.5 flex-1">
          <div className="h-3.5 w-28 bg-white/[0.06] rounded-lg" />
          <div className="h-2.5 w-16 bg-white/[0.03] rounded" />
        </div>
      </div>

      {/* Messages skeleton */}
      <div className="flex-1 px-4 py-4 flex flex-col gap-3">
        {[
          { isMe: false, w: '55%' }, { isMe: true, w: '40%' },
          { isMe: false, w: '65%' }, { isMe: false, w: '45%' },
          { isMe: true, w: '50%' },  { isMe: true, w: '35%' },
          { isMe: false, w: '60%' },
        ].map(({ isMe, w }, i) => (
          <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-pulse`}>
            <div
              className="h-9 rounded-2xl"
              style={{
                width: w,
                background: isMe ? 'rgba(201,168,76,0.12)' : 'rgba(255,255,255,0.05)',
              }}
            />
          </div>
        ))}
      </div>

      {/* Input skeleton */}
      <div className="glass border-t border-white/[0.06] px-3 py-3 flex items-center gap-2 animate-pulse">
        <div className="w-10 h-10 rounded-xl bg-white/[0.06]" />
        <div className="flex-1 h-10 rounded-xl bg-white/[0.06]" />
        <div className="w-10 h-10 rounded-xl bg-white/[0.06]" />
      </div>
    </div>
  )
}
