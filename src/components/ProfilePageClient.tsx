'use client'

import { useState } from 'react'
import { Edit2 } from 'lucide-react'
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
  sexuality: string
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
        className="w-9 h-9 rounded-xl glass flex items-center justify-center text-white/60 hover:text-white transition-colors border border-white/10"
        title="Edit profile"
      >
        <Edit2 size={15} />
      </button>

      {editing && (
        <ProfileEditor
          initialData={{
            full_name:       displayUser.name,
            bio:             displayUser.bio,
            profession:      displayUser.profession,
            company:         displayUser.company,
            city:            displayUser.city,
            country:         displayUser.country,
            age:             displayUser.age || null,
            category:        displayUser.category,
            sexuality:       displayUser.sexuality,
            interests:       displayUser.interests,
            linkedin_url:    displayUser.linkedin_url,
            website:         displayUser.website,
            is_open_to_work: displayUser.is_open_to_work,
            avatar_url:      displayUser.avatar_url,
            photos:          displayUser.photos,
            prompts:         (displayUser as { prompts?: { question: string; answer: string }[] }).prompts ?? [],
            userId:          displayUser.id,
          }}
          onClose={() => setEditing(false)}
        />
      )}
    </>
  )
}
