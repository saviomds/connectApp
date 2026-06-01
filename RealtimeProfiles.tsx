'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function RealtimeProfiles({ initialProfiles }: { initialProfiles: any[] }) {
  const [profiles, setProfiles] = useState(initialProfiles)
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase
      .channel('realtime_profiles')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'profiles',
        },
        (payload: { new: unknown }) => {
          setProfiles((current) => [payload.new, ...current])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {profiles.map((profile) => (
        <div
          key={profile.id}
          className="bg-white border border-gray-100 rounded-xl p-6 flex flex-col items-center text-center shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="w-20 h-20 bg-indigo-100 rounded-full mb-4 flex items-center justify-center overflow-hidden">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.username} className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-indigo-600 uppercase">{(profile.username || 'U')[0]}</span>
            )}
          </div>
          <h3 className="font-semibold text-lg">{profile.username || `User_${profile.id.slice(0, 4)}`}</h3>
          <p className="text-sm text-gray-500">Joined {new Date(profile.created_at).toLocaleDateString()}</p>
        </div>
      ))}
    </div>
  )
}