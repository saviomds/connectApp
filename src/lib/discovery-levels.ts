import type { UserCategory } from '@/types/database'

export type UserLevel = 1 | 2 | 3

const PROFESSIONAL_CATEGORIES: UserCategory[] = [
  'professional', 'entrepreneur', 'creator', 'company', 'divorced',
]

/**
 * Level assignment (same logic as the SQL trigger):
 *   3 (Verified)    — is_verified = true
 *   2 (Professional)— is_professional = true OR professional-type category
 *   1 (Youth)       — everything else
 *
 * Level 3 takes precedence: a verified professional is Level 3.
 */
export function computeUserLevel(profile: {
  is_verified: boolean
  is_professional: boolean
  category: UserCategory | null
}): UserLevel {
  if (profile.is_verified) return 3
  if (
    profile.is_professional ||
    (profile.category !== null && PROFESSIONAL_CATEGORIES.includes(profile.category))
  ) return 2
  return 1
}

/**
 * Returns the full set of levels the requesting user is allowed to see.
 *
 * Rules:
 *   Level 1 (Youth)       — always [1], no premium upgrades
 *   Level 2 (Professional)— [2] by default; premium unlocks additional levels
 *   Level 3 (Verified)    — [3] by default; premium unlocks additional levels
 *
 * `unlockedLevels` stores the extra levels the user has explicitly purchased
 * visibility into. These are only respected when is_premium = true.
 */
export function getAllowedLevels(
  myLevel: UserLevel,
  isPremium: boolean,
  unlockedLevels: number[],
): UserLevel[] {
  if (myLevel === 1) return [1]  // Youth: strictly own level only
  if (!isPremium) return [myLevel]

  const valid = (unlockedLevels ?? []).filter(
    (l): l is UserLevel =>
      (l === 1 || l === 2 || l === 3) && l !== myLevel,
  )
  return [...new Set([myLevel, ...valid])] as UserLevel[]
}

/**
 * Returns true when the calling user is allowed to unlock visibility
 * to `targetLevel`.
 *
 * Level 1 users cannot unlock anything.
 * Level 2 premium users may unlock 1 (youth) or 3 (verified).
 * Level 3 premium users may unlock 1 (youth) or 2 (professional).
 */
export function canUnlockLevel(
  myLevel: UserLevel,
  isPremium: boolean,
  targetLevel: UserLevel,
): boolean {
  if (!isPremium) return false
  if (myLevel === 1) return false
  if (targetLevel === myLevel) return false
  if (myLevel === 2) return targetLevel === 1 || targetLevel === 3
  if (myLevel === 3) return targetLevel === 1 || targetLevel === 2
  return false
}
