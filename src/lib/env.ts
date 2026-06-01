const CLIENT_REQUIRED = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
] as const

const SERVER_REQUIRED = [
  'SUPABASE_SERVICE_ROLE_KEY',
] as const

export function validateEnv() {
  const missing = [
    ...CLIENT_REQUIRED.filter((k) => !process.env[k]),
    ...(typeof window === 'undefined'
      ? SERVER_REQUIRED.filter((k) => !process.env[k])
      : []),
  ]

  if (missing.length > 0) {
    const msg =
      `Missing required environment variables:\n  ${missing.join('\n  ')}\n\n` +
      'Add them to .env.local. Stripe keys are configured in Admin → Settings.'
    if (typeof window === 'undefined') throw new Error(msg)
    else console.warn('[env]', msg)
  }
}

export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
}
