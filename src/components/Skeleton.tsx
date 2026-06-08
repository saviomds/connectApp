import { clsx } from 'clsx'

interface SkeletonProps {
  className?: string
  rounded?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
}

export function Skeleton({ className, rounded = 'lg' }: SkeletonProps) {
  const r = {
    sm: 'rounded', md: 'rounded-md', lg: 'rounded-lg',
    xl: 'rounded-xl', '2xl': 'rounded-2xl', full: 'rounded-full',
  }[rounded]
  return (
    <div
      className={clsx('animate-pulse', r, className)}
      style={{ background: 'rgba(255,255,255,0.06)' }}
    />
  )
}

export function ProfileCardSkeleton() {
  return (
    <div className="glass rounded-3xl overflow-hidden border border-white/[0.07] animate-pulse">
      <div className="h-72 sm:h-96" style={{ background: 'rgba(255,255,255,0.05)' }} />
      <div className="p-5 space-y-3">
        <div className="flex items-center gap-3">
          <Skeleton className="w-32 h-5" />
          <Skeleton className="w-16 h-5" rounded="full" />
        </div>
        <Skeleton className="w-48 h-4" />
        <Skeleton className="w-full h-4" />
        <Skeleton className="w-3/4 h-4" />
      </div>
    </div>
  )
}

export function MatchCardSkeleton() {
  return (
    <div className="glass rounded-3xl p-4 border border-white/[0.07] animate-pulse flex items-center gap-4">
      <Skeleton className="w-[60px] h-[60px] shrink-0" rounded="full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="w-32 h-4" />
        <Skeleton className="w-24 h-3" />
      </div>
      <Skeleton className="w-10 h-10" rounded="xl" />
    </div>
  )
}

export function MessageRowSkeleton() {
  return (
    <div className="flex items-center gap-3.5 py-4 animate-pulse">
      <Skeleton className="w-[52px] h-[52px] shrink-0" rounded="full" />
      <div className="flex-1 space-y-2">
        <div className="flex justify-between">
          <Skeleton className="w-28 h-4" />
          <Skeleton className="w-8 h-3" />
        </div>
        <Skeleton className="w-48 h-3" />
      </div>
    </div>
  )
}

export function ProfilePageSkeleton() {
  return (
    <div className="min-h-screen pt-nav pb-nav-bottom">
      <div className="h-36 sm:h-44 animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="flex items-end justify-between -mt-12 mb-5">
          <Skeleton className="w-24 h-24 sm:w-28 sm:h-28" rounded="2xl" />
          <div className="flex gap-2 mb-2">
            <Skeleton className="w-9 h-9" rounded="xl" />
            <Skeleton className="w-20 h-9" rounded="xl" />
          </div>
        </div>
        <div className="space-y-4">
          <Skeleton className="w-48 h-7" />
          <Skeleton className="w-32 h-4" />
          <Skeleton className="w-full h-24" rounded="2xl" />
          <Skeleton className="w-full h-40" rounded="2xl" />
        </div>
      </div>
    </div>
  )
}
