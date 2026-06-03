export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center pt-nav-flush">
      <div className="flex flex-col items-center gap-4 animate-fade-up">

        {/* Vibro logo spinner */}
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-gold"
          style={{ background: '#C9A84C' }}
        >
          <svg
            width="28" height="25" viewBox="0 0 20 18" fill="none"
            className="animate-pulse"
            aria-hidden="true"
          >
            <path d="M1.5 2C4 12 9 16 9 16C9 16 14 12 18.5 2"
              stroke="black" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="1.5" cy="2" r="1.5" fill="black" />
            <circle cx="18.5" cy="2" r="1.5" fill="black" />
          </svg>
        </div>

        {/* Shimmer bar */}
        <div className="flex flex-col items-center gap-2">
          <div className="w-32 h-2 rounded-full animate-shimmer" />
          <div className="w-20 h-2 rounded-full animate-shimmer opacity-60" />
        </div>
      </div>
    </div>
  )
}
