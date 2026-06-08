import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function normalize(phone: string): string {
  return phone.replace(/[\s\-().]/g, '')
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const phone = normalize(body?.phone ?? '')
    const code: string = (body?.code ?? '').trim()

    if (!phone || !code) {
      return NextResponse.json({ error: 'Phone and code are required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date().toISOString()

    // Find a valid code: matches user + phone + code, unused, not expired
    const { data: record, error: findErr } = await supabase
      .from('phone_verifications')
      .select('id')
      .eq('user_id', user.id)
      .eq('phone', phone)
      .eq('code', code)
      .eq('used', false)
      .gte('expires_at', now)
      .single()

    if (findErr || !record) {
      return NextResponse.json(
        { error: 'Invalid or expired code. Please request a new one.' },
        { status: 400 }
      )
    }

    // Mark the code as used so it cannot be reused
    await supabase
      .from('phone_verifications')
      .update({ used: true })
      .eq('id', record.id)

    // Update profile: phone verified + Mauritius flag
    const { error: profileErr } = await supabase
      .from('profiles')
      .update({
        phone,
        phone_verified: true,
        is_from_mauritius: true,
      })
      .eq('id', user.id)

    if (profileErr) {
      console.error('[verify/phone/confirm] profile update error:', profileErr)
      return NextResponse.json({ error: 'Verified but failed to update profile' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[verify/phone/confirm]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
