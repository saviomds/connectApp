'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Plus, Check, Briefcase, MapPin, User, Globe, Link2, CheckCircle, Camera, Loader2, Images } from 'lucide-react'

interface ProfileData {
  full_name: string
  bio: string
  profession: string
  company: string
  city: string
  country: string
  age: number | null
  category: string
  interests: string[]
  linkedin_url: string
  website: string
  is_open_to_work: boolean
  avatar_url: string
  photos: string[]
  userId: string
}

const CATEGORIES = [
  { id: 'professional', label: 'Professional', emoji: '💼' },
  { id: 'entrepreneur', label: 'Entrepreneur', emoji: '🚀' },
  { id: 'creator',      label: 'Creator',      emoji: '🎨' },
  { id: 'young_youth',  label: 'Young Youth',  emoji: '⚡' },
  { id: 'divorced',     label: 'New Chapter',  emoji: '🌿' },
  { id: 'company',      label: 'Company',      emoji: '🏢' },
]

interface Props {
  initialData: ProfileData
  onClose: () => void
}

export default function ProfileEditor({ initialData, onClose }: Props) {
  const router = useRouter()
  const [data, setData] = useState(initialData)
  const [newInterest, setNewInterest] = useState('')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState(initialData.avatar_url)
  const [photos, setPhotos] = useState<string[]>(initialData.photos ?? [])
  const [photoUploading, setPhotoUploading] = useState(false)

  const set = (key: keyof ProfileData, val: unknown) =>
    setData((d) => ({ ...d, [key]: val }))

  const addInterest = () => {
    const tag = newInterest.trim()
    if (!tag || data.interests.includes(tag) || data.interests.length >= 10) return
    set('interests', [...data.interests, tag])
    setNewInterest('')
  }

  const removeInterest = (tag: string) =>
    set('interests', data.interests.filter((t) => t !== tag))

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setPreviewUrl(URL.createObjectURL(file))
  }

  const handleAddPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (e.target) e.target.value = ''
    setPhotoUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/profile/photos', { method: 'POST', body: fd })
    if (res.ok) {
      const { photos: updated } = await res.json()
      setPhotos(updated)
    }
    setPhotoUploading(false)
  }

  const handleRemovePhoto = async (url: string) => {
    const res = await fetch('/api/profile/photos', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    })
    if (res.ok) {
      const { photos: updated } = await res.json()
      setPhotos(updated)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')

    try {
      let avatarUrl = data.avatar_url

      // Upload avatar if changed
      if (avatarFile) {
        const fd = new FormData()
        fd.append('file', avatarFile)
        const uploadRes = await fetch('/api/storage/avatar', { method: 'POST', body: fd })
        if (!uploadRes.ok) {
          const { error: uploadErr } = await uploadRes.json()
          throw new Error(uploadErr ?? 'Avatar upload failed')
        }
        const { url } = await uploadRes.json()
        avatarUrl = url
      }

      // Save profile
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: data.full_name,
          bio: data.bio || null,
          profession: data.profession || null,
          company: data.company || null,
          city: data.city || null,
          country: data.country || null,
          age: data.age,
          category: data.category || null,
          interests: data.interests,
          linkedin_url: data.linkedin_url || null,
          website: data.website || null,
          is_open_to_work: data.is_open_to_work,
          avatar_url: avatarUrl || null,
        }),
      })

      if (!res.ok) {
        const { error: saveErr } = await res.json()
        throw new Error(saveErr ?? 'Failed to save profile')
      }

      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        onClose()
        router.refresh()
      }, 1200)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setSaving(false)
    }
  }

  return (
    /* Mobile: slides up from bottom full-width. Desktop: centered modal */
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:px-4 sm:py-6">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />

      {/* Sheet / modal card */}
      <div
        className="relative w-full sm:max-w-lg modal rounded-t-3xl sm:rounded-2xl overflow-hidden flex flex-col animate-fade-up"
        style={{ maxHeight: '92dvh' }}>

        {/* Gold accent line */}
        <div className="h-[2px] shrink-0" style={{ background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.5), transparent)' }} />

        {/* ── Fixed header ── */}
        <div className="modal-header flex items-center justify-between px-5 py-4 shrink-0">
          <h2 className="text-base font-bold text-white">Edit Profile</h2>
          <div className="flex items-center gap-2">
            {success && (
              <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: 'rgba(46,204,113,0.13)', color: '#2ECC71', border: '1px solid rgba(46,204,113,0.25)' }}>
                <CheckCircle size={12} /> Saved
              </span>
            )}
            <button onClick={onClose}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white/50 hover:text-white transition-colors"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
              <X size={15} />
            </button>
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div className="overflow-y-auto flex-1 px-5 py-5 flex flex-col gap-5">
            {/* Avatar */}
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-2xl overflow-hidden shrink-0 relative"
                style={{ border: '2px solid rgba(201,168,76,0.3)' }}>
                {previewUrl
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={previewUrl} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-2xl font-bold" style={{ background: 'rgba(201,168,76,0.1)', color: '#C9A84C' }}>{(data.full_name || 'U').charAt(0)}</div>
                }
              </div>
              <div>
                <label htmlFor="avatar-upload"
                  className="btn-gold px-4 py-2 rounded-xl text-sm font-semibold text-black block mb-1 cursor-pointer text-center">
                  Change Photo
                </label>
                <p className="text-xs text-white/30">JPG, PNG, WebP — max 5 MB</p>
              </div>
              <input id="avatar-upload" type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" onChange={handleAvatarChange} />
            </div>

            {/* Discover photos */}
            <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,168,76,0.14)' }}>
              {/* Header */}
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-white flex items-center gap-1.5">
                  <Images size={14} style={{ color: '#C9A84C' }} /> Discover Photos
                </span>
                <span className="text-xs font-bold"
                  style={{ color: photos.length >= 5 ? '#C9A84C' : 'rgba(255,255,255,0.35)' }}>
                  {photos.length} / 5
                </span>
              </div>
              <p className="text-[11px] text-white/35 mb-3">
                Shown as a photo carousel on your swipe card · more photos = more interest
              </p>

              {/* Slot progress bar */}
              <div className="flex gap-1 mb-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex-1 h-1 rounded-full transition-all duration-300"
                    style={{ background: i < photos.length ? '#C9A84C' : 'rgba(255,255,255,0.1)' }} />
                ))}
              </div>

              {/* Photo grid */}
              <div className="grid grid-cols-3 gap-2">
                {photos.map((url, idx) => (
                  <div key={url} className="relative aspect-square rounded-xl overflow-hidden group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    {idx === 0 && (
                      <div className="absolute bottom-1 left-1 text-[9px] font-bold bg-black/60 text-white/70 px-1.5 py-0.5 rounded-full">
                        1st shown
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(url)}
                      className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <X size={18} className="text-white" />
                    </button>
                  </div>
                ))}
                {photos.length < 5 && (
                  <label
                    htmlFor={photoUploading ? undefined : 'profile-photo-upload'}
                    className="aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer"
                    style={photoUploading
                      ? { borderColor: 'rgba(255,255,255,0.1)', opacity: 0.4, pointerEvents: 'none' }
                      : { borderColor: 'rgba(201,168,76,0.25)', color: 'rgba(201,168,76,0.6)' }}>
                    {photoUploading
                      ? <Loader2 size={18} className="animate-spin text-white/30" />
                      : <>
                          <Camera size={18} />
                          <span className="text-[10px] font-medium">Add photo</span>
                        </>}
                  </label>
                )}
              </div>
              <input id="profile-photo-upload" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={handleAddPhoto} />

              {photos.length >= 5 && (
                <p className="text-[11px] text-center mt-3 font-semibold" style={{ color: '#C9A84C' }}>
                  ✓ All 5 slots filled — you'll stand out in Discover!
                </p>
              )}
            </div>

            {/* Name */}
            <div>
              <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">Full Name</label>
              <div className="relative">
                <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                <input value={data.full_name} onChange={(e) => set('full_name', e.target.value)} placeholder="Your name"
                  className="w-full h-11 pl-9 pr-4 rounded-xl bg-white/[0.06] border border-white/10 text-white placeholder-white/25 text-sm input-focus" />
              </div>
            </div>

            {/* Bio */}
            <div>
              <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">Bio</label>
              <textarea value={data.bio} onChange={(e) => set('bio', e.target.value)} rows={3}
                placeholder="Tell people about yourself…"
                className="w-full px-4 py-3 rounded-xl bg-white/[0.06] border border-white/10 text-white placeholder-white/25 text-sm resize-none input-focus" />
            </div>

            {/* Profession + Age */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">Profession</label>
                <div className="relative">
                  <Briefcase size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                  <input value={data.profession} onChange={(e) => set('profession', e.target.value)} placeholder="Role"
                    className="w-full h-11 pl-9 pr-3 rounded-xl bg-white/[0.06] border border-white/10 text-white placeholder-white/25 text-sm input-focus" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">Age</label>
                <input type="number" min={18} max={100} value={data.age ?? ''} onChange={(e) => set('age', e.target.value ? +e.target.value : null)}
                  placeholder="Age" className="w-full h-11 px-4 rounded-xl bg-white/[0.06] border border-white/10 text-white placeholder-white/25 text-sm input-focus" />
              </div>
            </div>

            {/* Company */}
            <div>
              <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">Company</label>
              <input value={data.company} onChange={(e) => set('company', e.target.value)} placeholder="Where do you work?"
                className="w-full h-11 px-4 rounded-xl bg-white/[0.06] border border-white/10 text-white placeholder-white/25 text-sm input-focus" />
            </div>

            {/* Location */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">City</label>
                <div className="relative">
                  <MapPin size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                  <input value={data.city} onChange={(e) => set('city', e.target.value)} placeholder="City"
                    className="w-full h-11 pl-9 pr-3 rounded-xl bg-white/[0.06] border border-white/10 text-white placeholder-white/25 text-sm input-focus" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">Country</label>
                <input value={data.country} onChange={(e) => set('country', e.target.value)} placeholder="Country"
                  className="w-full h-11 px-4 rounded-xl bg-white/[0.06] border border-white/10 text-white placeholder-white/25 text-sm input-focus" />
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Category</label>
              <div className="grid grid-cols-3 gap-2">
                {CATEGORIES.map(({ id, label, emoji }) => (
                  <button key={id} onClick={() => set('category', id)}
                    className="p-2.5 rounded-xl text-xs font-medium border text-center transition-all"
                    style={{
                      background: data.category === id ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.04)',
                      borderColor: data.category === id ? '#C9A84C' : 'rgba(255,255,255,0.08)',
                      color: data.category === id ? '#C9A84C' : 'rgba(255,255,255,0.6)',
                    }}>
                    {emoji} {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Interests */}
            <div>
              <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Interests</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {data.interests.map((tag) => (
                  <span key={tag} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
                    style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.25)', color: '#C9A84C' }}>
                    {tag}
                    <button onClick={() => removeInterest(tag)} className="hover:text-white transition-colors"><X size={11} /></button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={newInterest} onChange={(e) => setNewInterest(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addInterest(); } }}
                  placeholder="Add interest…" className="flex-1 h-10 px-3 rounded-xl bg-white/[0.06] border border-white/10 text-white placeholder-white/25 text-sm input-focus" />
                <button onClick={addInterest} disabled={!newInterest.trim()}
                  className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/[0.06] hover:bg-white/10 text-white/60 hover:text-white disabled:opacity-30 transition-colors">
                  <Plus size={16} />
                </button>
              </div>
            </div>

            {/* Social links */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">LinkedIn</label>
                <div className="relative">
                  <Link2 size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                  <input value={data.linkedin_url} onChange={(e) => set('linkedin_url', e.target.value)} placeholder="linkedin.com/in/you"
                    className="w-full h-11 pl-9 pr-3 rounded-xl bg-white/[0.06] border border-white/10 text-white placeholder-white/25 text-sm input-focus" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">Website</label>
                <div className="relative">
                  <Globe size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                  <input value={data.website} onChange={(e) => set('website', e.target.value)} placeholder="yoursite.com"
                    className="w-full h-11 pl-9 pr-3 rounded-xl bg-white/[0.06] border border-white/10 text-white placeholder-white/25 text-sm input-focus" />
                </div>
              </div>
            </div>

            {/* Open to work */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">Open to opportunities</p>
                <p className="text-xs text-white/40">Show a badge on your profile</p>
              </div>
              <button onClick={() => set('is_open_to_work', !data.is_open_to_work)}
                className="w-12 h-6 rounded-full transition-colors relative"
                style={{ background: data.is_open_to_work ? '#C9A84C' : 'rgba(255,255,255,0.1)' }}>
                <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all"
                  style={{ left: data.is_open_to_work ? 'calc(100% - 22px)' : 2 }} />
              </button>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl text-sm text-red-400" style={{ background: 'rgba(231,76,60,0.12)', border: '1px solid rgba(231,76,60,0.25)' }}>
                {error}
              </div>
            )}
          </div>

          {/* ── Fixed footer ── */}
          <div className="modal-header shrink-0 px-5 py-4 flex gap-3" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <button onClick={onClose}
              className="flex-1 h-11 rounded-xl text-white/65 hover:text-white text-sm font-semibold transition-colors"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 h-11 btn-gold rounded-xl font-bold text-black text-sm flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.98] transition-all">
              {saving
                ? <Loader2 size={15} className="animate-spin" />
                : <><Check size={15} /> Save Changes</>}
            </button>
          </div>
        </div>
      </div>
  )
}
