import 'server-only'
import nodemailer from 'nodemailer'
import { adminSupabase } from './supabase/admin'

// ─── Transport ────────────────────────────────────────────────

function getTransport() {
  const user = process.env.GMAIL_USER
  const pass = process.env.GMAIL_APP_PASSWORD
  if (!user || !pass) return null
  return nodemailer.createTransport({ service: 'gmail', auth: { user, pass } })
}

// ─── Helpers ──────────────────────────────────────────────────

async function getRecipient(userId: string) {
  const [{ data: authUser }, { data: profile }] = await Promise.all([
    adminSupabase.auth.admin.getUserById(userId),
    adminSupabase
      .from('profiles')
      .select('full_name, notify_matches, notify_messages, is_online, last_seen_at')
      .eq('id', userId)
      .single(),
  ])
  return {
    email: authUser?.user?.email ?? null,
    name:  (profile?.full_name ?? '').split(' ')[0] || 'there',
    prefs: {
      notify_matches:  profile?.notify_matches  ?? true,
      notify_messages: profile?.notify_messages ?? true,
    },
    isOnline: !!profile?.is_online,
    lastSeen: profile?.last_seen_at ? new Date(profile.last_seen_at) : null,
  }
}

function isRecentlyActive(lastSeen: Date | null): boolean {
  if (!lastSeen) return false
  return Date.now() - lastSeen.getTime() < 5 * 60 * 1000 // 5 min
}

// ─── Base HTML wrapper ────────────────────────────────────────

function wrap(body: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Vibro</title></head>
<body style="margin:0;padding:0;background:#0A0A0B;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,sans-serif">
<div style="max-width:480px;margin:0 auto;padding:36px 20px">

  <!-- Logo -->
  <div style="text-align:center;margin-bottom:28px">
    <div style="display:inline-block;width:48px;height:48px;border-radius:14px;background:#C9A84C;line-height:48px;text-align:center;margin-bottom:8px">
      <svg width="24" height="21" viewBox="0 0 20 18" fill="none" style="vertical-align:middle">
        <path d="M1.5 2C4 12 9 16 9 16C9 16 14 12 18.5 2" stroke="black" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="1.5" cy="2" r="1.5" fill="black"/>
        <circle cx="18.5" cy="2" r="1.5" fill="black"/>
      </svg>
    </div>
    <div style="color:#C9A84C;font-size:13px;font-weight:700;letter-spacing:3px;text-transform:uppercase">VIBRO</div>
  </div>

  <!-- Card -->
  <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.09);border-radius:18px;padding:28px 24px">
    ${body}
  </div>

  <!-- Footer -->
  <div style="text-align:center;margin-top:20px">
    <p style="color:rgba(255,255,255,0.15);font-size:11px;margin:0">
      You're receiving this because you have notifications enabled in Vibro.<br>
      Manage in <a href="https://vibro.app/settings" style="color:rgba(201,168,76,0.6);text-decoration:none">Settings</a>.
    </p>
    <p style="color:rgba(255,255,255,0.08);font-size:11px;margin:6px 0 0">© 2025 Vibro · All rights reserved</p>
  </div>
</div>
</body>
</html>`
}

function btn(label: string, url: string): string {
  return `<a href="${url}" style="display:inline-block;margin-top:18px;padding:12px 28px;border-radius:12px;background:#C9A84C;color:#000;font-size:14px;font-weight:700;text-decoration:none">${label}</a>`
}

// ─── Email senders ────────────────────────────────────────────

export async function sendMatchEmail(recipientId: string, matchedWithName: string) {
  try {
    const transport = getTransport()
    if (!transport) return

    const recipient = await getRecipient(recipientId)
    if (!recipient.email || !recipient.prefs.notify_matches) return
    if (recipient.isOnline || isRecentlyActive(recipient.lastSeen)) return

    const body = `
      <div style="text-align:center">
        <div style="font-size:48px;margin-bottom:12px">🎉</div>
        <h2 style="color:#fff;font-size:22px;font-weight:800;margin:0 0 8px">It's a Match!</h2>
        <p style="color:rgba(255,255,255,0.5);font-size:14px;margin:0 0 20px;line-height:1.6">
          Hi ${recipient.name}! You and <strong style="color:#fff">${matchedWithName}</strong> liked each other.<br>
          Start a conversation now before the spark fades! ✨
        </p>
        ${btn('Message ' + matchedWithName, 'https://vibro.app/messages')}
      </div>`

    await transport.sendMail({
      from:    `"Vibro" <${process.env.GMAIL_USER}>`,
      to:      recipient.email,
      subject: `🎉 You matched with ${matchedWithName}!`,
      html:    wrap(body),
    })
  } catch (err) {
    console.error('[send-email] match error:', err)
  }
}

export async function sendMessageEmail(
  recipientId: string,
  senderName: string,
  preview: string,
  convId: string,
) {
  try {
    const transport = getTransport()
    if (!transport) return

    const recipient = await getRecipient(recipientId)
    if (!recipient.email || !recipient.prefs.notify_messages) return
    if (recipient.isOnline || isRecentlyActive(recipient.lastSeen)) return

    const body = `
      <div>
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
          <div style="width:40px;height:40px;border-radius:50%;background:rgba(201,168,76,0.15);border:1px solid rgba(201,168,76,0.3);display:inline-flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">💬</div>
          <div>
            <p style="color:#fff;font-size:15px;font-weight:700;margin:0">${senderName}</p>
            <p style="color:rgba(255,255,255,0.4);font-size:12px;margin:2px 0 0">sent you a message</p>
          </div>
        </div>
        <div style="background:rgba(255,255,255,0.05);border-left:3px solid #C9A84C;border-radius:0 10px 10px 0;padding:12px 14px;margin-bottom:4px">
          <p style="color:rgba(255,255,255,0.75);font-size:14px;margin:0;line-height:1.5;font-style:italic">"${preview}"</p>
        </div>
        <div style="text-align:center">
          ${btn('Reply to ' + senderName, 'https://vibro.app/messages/' + convId)}
        </div>
      </div>`

    await transport.sendMail({
      from:    `"Vibro" <${process.env.GMAIL_USER}>`,
      to:      recipient.email,
      subject: `💬 ${senderName}: "${preview.slice(0, 50)}${preview.length > 50 ? '…' : ''}"`,
      html:    wrap(body),
    })
  } catch (err) {
    console.error('[send-email] message error:', err)
  }
}

export async function sendSuperLikeEmail(recipientId: string, senderName: string) {
  try {
    const transport = getTransport()
    if (!transport) return

    const recipient = await getRecipient(recipientId)
    if (!recipient.email || !recipient.prefs.notify_matches) return
    if (recipient.isOnline || isRecentlyActive(recipient.lastSeen)) return

    const body = `
      <div style="text-align:center">
        <div style="font-size:48px;margin-bottom:12px">⭐</div>
        <h2 style="color:#fff;font-size:20px;font-weight:800;margin:0 0 8px">Someone Super-Liked You!</h2>
        <p style="color:rgba(255,255,255,0.5);font-size:14px;margin:0 0 6px;line-height:1.6">
          Hi ${recipient.name}!
        </p>
        <p style="color:rgba(255,255,255,0.5);font-size:14px;margin:0 0 20px;line-height:1.6">
          <strong style="color:#C9A84C">${senderName}</strong> thinks you're exceptional and sent you a Super Like. ⭐<br>
          Like them back to match instantly!
        </p>
        ${btn('See Who Liked You', 'https://vibro.app/discover')}
      </div>`

    await transport.sendMail({
      from:    `"Vibro" <${process.env.GMAIL_USER}>`,
      to:      recipient.email,
      subject: `⭐ ${senderName} super-liked your profile!`,
      html:    wrap(body),
    })
  } catch (err) {
    console.error('[send-email] super-like error:', err)
  }
}

export async function sendVerificationEmail(
  recipientId: string,
  approved: boolean,
  note?: string,
) {
  try {
    const transport = getTransport()
    if (!transport) return

    const recipient = await getRecipient(recipientId)
    if (!recipient.email) return

    const body = approved
      ? `<div style="text-align:center">
          <div style="font-size:48px;margin-bottom:12px">✅</div>
          <h2 style="color:#fff;font-size:20px;font-weight:800;margin:0 0 8px">You're Verified!</h2>
          <p style="color:rgba(255,255,255,0.5);font-size:14px;margin:0 0 4px">Hi ${recipient.name},</p>
          <p style="color:rgba(255,255,255,0.5);font-size:14px;margin:0 0 20px;line-height:1.6">
            Your identity has been verified. Your profile now shows the
            <strong style="color:#4A90E2">Verified badge</strong> and you have full Level 3 access.
          </p>
          ${btn('View My Profile', 'https://vibro.app/profile')}
        </div>`
      : `<div style="text-align:center">
          <div style="font-size:48px;margin-bottom:12px">❌</div>
          <h2 style="color:#fff;font-size:20px;font-weight:800;margin:0 0 8px">Verification Update</h2>
          <p style="color:rgba(255,255,255,0.5);font-size:14px;margin:0 0 4px">Hi ${recipient.name},</p>
          <p style="color:rgba(255,255,255,0.5);font-size:14px;margin:0 0 16px;line-height:1.6">
            Unfortunately your verification request was not approved.
          </p>
          ${note ? `<div style="background:rgba(231,76,60,0.08);border:1px solid rgba(231,76,60,0.22);border-radius:10px;padding:12px 14px;margin-bottom:16px;text-align:left">
            <p style="color:rgba(255,255,255,0.6);font-size:13px;margin:0"><strong style="color:rgba(231,76,60,0.9)">Reason:</strong> ${note}</p>
          </div>` : ''}
          ${btn('Resubmit Verification', 'https://vibro.app/profile')}
        </div>`

    await transport.sendMail({
      from:    `"Vibro" <${process.env.GMAIL_USER}>`,
      to:      recipient.email,
      subject: approved ? '✅ Your Vibro profile is now verified!' : 'Vibro verification update',
      html:    wrap(body),
    })
  } catch (err) {
    console.error('[send-email] verification error:', err)
  }
}
