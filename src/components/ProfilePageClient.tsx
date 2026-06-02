'use client'

import { useState } from 'react'
import { Edit } from 'lucide-react'
import ProfileEditor from './ProfileEditor'

interface DisplayUser {
  id: string
  name: string
  profession: string
  company: string
  city: string
  country: string
  bio: string
  interests: string[]
  age: number
  category: string
  linkedin_url: string
  website: string
  is_open_to_work: boolean
  avatar_url: string
  photos: string[]
}

export default function ProfilePageClient({ displayUser }: { displayUser: DisplayUser }) {
  const [editing, setEditing] = useState(false)

  return (
    <>
      <button
        onClick={() => setEditing(true)}
        className="btn-gold px-4 py-2 rounded-xl text-sm font-semibold text-black flex items-center gap-1.5"
      >
        <Edit size={14} /> Edit
      </button>

      {editing && (
        <ProfileEditor
          initialData={{
            full_name: displayUser.name,
            bio: displayUser.bio,
            profession: displayUser.profession,
            company: displayUser.company,
            city: displayUser.city,
            country: displayUser.country,
            age: displayUser.age || null,
            category: displayUser.category,
            interests: displayUser.interests,
            linkedin_url: displayUser.linkedin_url,
            website: displayUser.website,
            is_open_to_work: displayUser.is_open_to_work,
            avatar_url: displayUser.avatar_url,
            photos: displayUser.photos,
            userId: displayUser.id,
          }}
          onClose={() => setEditing(false)}
        />
      )}
    </>
  )
}
