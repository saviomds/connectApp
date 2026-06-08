import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import nodemailer from 'nodemailer'

// +230 followed by 7–8 digits (Mauritius landline + mobile)
function isMauritiusPhone(phone: string): boolean {
  return /^\+230\d{7,8}$/.test(phone)
}

function normalize(phone: string): string {
  return phone.replace(/[\s\-().]/g, '')
}

function makeCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

function getTransport() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  })
}

function emailHtml(name: string, code: string, phone: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0A0A0B;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,sans-serif">
  <div style="max-width:480px;margin:0 auto;padding:40px 24px">
    <div style="text-align:center;margin-bottom:32px">
      <div style="display:inline-block;width:52px;height:52px;border-radius:14px;background:#C9A84C;line-height:52px;text-align:center;margin-bottom:10px">
        <svg width="26" height="23" viewBox="0 0 20 18" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align:middle">
          <path d="M1.5 2C4 12 9 16 9 16C9 16 14 12 18.5 2" stroke="black" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/>
          <circle cx="1.5" cy="2" r="1.5" fill="black"/>
          <circle cx="18.5" cy="2" r="1.5" fill="black"/>
        </svg>
      </div>
      <div style="color:#ffffff;font-size:20px;font-weight:800;letter-spacing:-0.5px">VIBRO</div>
    </div>

    <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.09);border-radius:20px;padding:32px;text-align:center">
      <div style="width:52px;height:52px;border-radius:50%;background:rgba(201,168,76,0.12);border:1px solid rgba(201,168,76,0.28);display:inline-block;line-height:52px;margin-bottom:18px;font-size:22px">📱</div>
      <h2 style="color:#ffffff;font-size:20px;font-weight:700;margin:0 0 8px 0">Mauritius Phone Verification</h2>
      <p style="color:rgba(255,255,255,0.45);font-size:14px;margin:0 0 6px 0">Hi ${name},</p>
      <p style="color:rgba(255,255,255,0.45);font-size:14px;margin:0 0 28px 0;line-height:1.55">
        Enter the code below to verify your Mauritius number.<br>
        It expires in <strong style="color:rgba(255,255,255,0.7)">10 minutes</strong> and can only be used once.
      </p>

      <div style="background:rgba(201,168,76,0.09);border:1.5px solid rgba(201,168,76,0.38);border-radius:14px;padding:22px 16px;margin-bottom:20px">
        <div style="color:#C9A84C;font-size:44px;font-weight:900;letter-spacing:14px;font-family:monospace">${code}</div>
      </div>

      <p style="color:rgba(255,255,255,0.28);font-size:12px;margin:0">
        Number: <strong style="color:rgba(255,255,255,0.5)">${phone}</strong>
      </p>
    </div>

    <div style="text-align:center;margin-top:24px">
      <p style="color:rgba(255,255,255,0.18);font-size:12px;margin:0">If you didn't request this, ignore this email.</p>
      <p style="color:rgba(255,255,255,0.12);font-size:11px;margin:6px 0 0">© 2025 Vibro · All rights reserved</p>
    </div>
  </div>
</body>
</html>`
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const raw: string = body?.phone ?? ''
    const phone = normalize(raw)

    if (!isMauritiusPhone(phone)) {
      return NextResponse.json(
        { error: 'Must be a valid Mauritius number starting with +230' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()

    const name = (profile?.full_name ?? '').split(' ')[0] || 'there'

    // Delete all previous unused codes for this user before creating a new one
    await supabase
      .from('phone_verifications')
      .delete()
      .eq('user_id', user.id)
      .eq('used', false)

    const code = makeCode()
    const expires_at = new Date(Date.now() + 10 * 60 * 1000).toISOString()

    const { error: insertErr } = await supabase
      .from('phone_verifications')
      .insert({ user_id: user.id, phone, code, expires_at })

    if (insertErr) {
      console.error('[verify/phone/send] insert error:', insertErr)
      return NextResponse.json({ error: 'Failed to create verification code' }, { status: 500 })
    }

    try {
      const transport = getTransport()
      await transport.sendMail({
        from: `"Vibro" <${process.env.GMAIL_USER}>`,
        to: user.email!,
        subject: `${code} — Your Vibro verification code`,
        html: emailHtml(name, code, phone),
      })
    } catch (emailErr) {
      console.error('[verify/phone/send] Gmail error:', emailErr)
      const msg = emailErr instanceof Error ? emailErr.message : String(emailErr)
      return NextResponse.json({ error: `Email failed: ${msg}` }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[verify/phone/send]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
