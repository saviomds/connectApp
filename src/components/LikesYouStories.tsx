'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'

interface LikeProfile {
  id: string
  full_name: string
  avatar_url: string
  profession: string
}

export default function LikesYouStories() {
  const [profiles, setProfiles] = useState<LikeProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)

  useEffect(() => {
    fetch('/api/matches/likes-you')
      .then(res => {
        if (res.status === 403) {
          setForbidden(true)
          return []
        }
        return res.json()
      })
      .then(data => {
        setProfiles(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading || forbidden || profiles.length === 0) return null

  return (
    <div className="w-full py-4 border-b border-gray-100 bg-white">
      <h3 className="px-4 text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
        People who like you ({profiles.length})
      </h3>
      <div className="flex overflow-x-auto space-x-4 px-4 no-scrollbar pb-2">
        {profiles.map((profile) => (
          <Link 
            key={profile.id} 
            href={`/discover?user=${profile.id}`} 
            className="flex-shrink-0 flex flex-col items-center space-y-1 group"
          >
            <div className="relative p-0.5 rounded-full bg-gradient-to-tr from-pink-500 to-yellow-500 group-hover:scale-105 transition-transform">
              <div className="w-16 h-16 rounded-full border-2 border-white overflow-hidden bg-gray-200">
                <img src={profile.avatar_url || '/default-avatar.png'} alt={profile.full_name} className="w-full h-full object-cover" />
              </div>
            </div>
            <span className="text-xs font-medium text-gray-700 max-w-[70px] truncate text-center">
              {profile.full_name.split(' ')[0]}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}