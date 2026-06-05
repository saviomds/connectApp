export default function DiscoverLoading() {
  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
      style={{ background: '#0A0A0B' }}
    >
      {/* Ambient glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute -top-1/4 -left-1/4 w-full h-full rounded-full"
          style={{ background: 'rgba(201,168,76,0.06)', filter: 'blur(120px)' }}
        />
        <div
          className="absolute -bottom-1/4 -right-1/4 w-full h-full rounded-full"
          style={{ background: 'rgba(201,168,76,0.06)', filter: 'blur(120px)' }}
        />
      </div>

      {/* Brand */}
      <div className="relative z-10 flex flex-col items-center" style={{ animation: 'vibro-pop 0.7s cubic-bezier(0.16,1,0.3,1) both' }}>
        {/* Logo icon */}
        <div
          className="w-24 h-24 rounded-[2rem] flex items-center justify-center mb-8"
          style={{
            background: 'linear-gradient(135deg, #C9A84C, #E5C76B)',
            animation: 'vibro-glow 3s ease-in-out infinite',
          }}
        >
          <svg width="48" height="43" viewBox="0 0 20 18" fill="none" aria-hidden="true">
            <path
              d="M1.5 2C4 12 9 16 9 16C9 16 14 12 18.5 2"
              stroke="black" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"
            />
            <circle cx="1.5" cy="2" r="1.5" fill="black" />
            <circle cx="18.5" cy="2" r="1.5" fill="black" />
          </svg>
        </div>

        <h1 className="text-5xl font-black text-white tracking-tighter mb-3">VIBRO</h1>

        <div className="flex items-center gap-3">
          <div className="h-px w-6 bg-white/10" />
          <span className="text-[10px] uppercase tracking-[0.5em] font-bold" style={{ color: '#C9A84C' }}>
            Elite Discovery
          </span>
          <div className="h-px w-6 bg-white/10" />
        </div>
      </div>

      {/* Loading bar */}
      <div
        className="absolute bottom-20 w-48 h-1 rounded-full overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.05)' }}
      >
        <div
          className="h-full rounded-full"
          style={{ background: '#C9A84C', animation: 'vibro-progress 2s ease-in-out infinite' }}
        />
      </div>

      <style>{`
        @keyframes vibro-pop {
          from { opacity: 0; transform: scale(0.85); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes vibro-glow {
          0%,100% { box-shadow: 0 0 20px rgba(201,168,76,0.15); }
          50%      { box-shadow: 0 0 60px rgba(201,168,76,0.40); }
        }
        @keyframes vibro-progress {
          0%   { width: 0%;    margin-left: 0%; }
          50%  { width: 70%;   margin-left: 15%; }
          100% { width: 0%;    margin-left: 100%; }
        }
      `}</style>
    </div>
  )
}
