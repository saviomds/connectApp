import { Loader2 } from 'lucide-react'
export default function Loading() {
  return (
    <div className="flex items-center justify-center h-48">
      <Loader2 size={22} className="animate-spin text-white/30" />
    </div>
  )
}
