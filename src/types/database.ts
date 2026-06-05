export type UserCategory = 'professional' | 'entrepreneur' | 'creator' | 'young_youth' | 'divorced' | 'company'
export type PremiumTier = 'gold' | 'platinum'
export type SwipeDirection = 'like' | 'pass' | 'super_like'
export type NotificationType = 'match' | 'message' | 'super_like' | 'profile_boost' | 'premium'
export type VerificationStatus = 'none' | 'pending' | 'approved' | 'rejected'
export type Gender = 'male' | 'female' | 'non_binary' | 'prefer_not_to_say'
export type Sexuality = 'straight' | 'gay' | 'lesbian' | 'bisexual' | 'pansexual' | 'asexual' | 'queer' | 'prefer_not_to_say'

/** Categories that require professional access + ID verification */
export const GATED_CATEGORIES: UserCategory[] = ['professional', 'divorced']

export interface IcebreakerPrompt {
  question: string
  answer: string
}

export interface DbProfile {
  id: string
  full_name: string
  bio: string | null
  profession: string | null
  company: string | null
  city: string | null
  country: string | null
  age: number | null
  category: UserCategory | null
  gender: Gender | null
  sexuality: Sexuality | null
  interests: string[]
  avatar_url: string | null
  photos: string[]
  linkedin_url: string | null
  website: string | null
  is_open_to_work: boolean
  is_verified: boolean
  is_premium: boolean
  premium_tier: PremiumTier | null
  is_professional: boolean
  verification_status: VerificationStatus
  is_online: boolean
  last_seen_at: string
  onboarding_completed: boolean
  profile_completion: number
  boosted_until: string | null
  is_admin: boolean
  prompts: IcebreakerPrompt[]
  created_at: string
  updated_at: string
}

export interface DbVerificationRequest {
  id: string
  user_id: string
  category: string
  photo_selfie_url: string
  photo_id_url: string
  photo_portrait_url: string
  status: 'pending' | 'approved' | 'rejected'
  admin_note: string | null
  created_at: string
  reviewed_at: string | null
}

export interface DbSwipe {
  id: string
  swiper_id: string
  target_id: string
  direction: SwipeDirection
  created_at: string
}

export interface DbMatch {
  id: string
  user1_id: string
  user2_id: string
  created_at: string
  expires_at: string | null
}

export interface DbConversation {
  id: string
  match_id: string
  created_at: string
  updated_at: string
}

export interface DbMessage {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  is_seen: boolean
  read_at: string | null
  created_at: string
}

export interface DbNotification {
  id: string
  user_id: string
  type: NotificationType
  data: Record<string, unknown>
  is_read: boolean
  created_at: string
}

export interface ConversationWithProfile {
  id: string
  match_id: string
  created_at: string
  updated_at: string
  other_profile: DbProfile
  last_message: string | null
  last_message_at: string | null
  unread_count: number
}
