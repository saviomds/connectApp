import Link from 'next/link'
import { ArrowLeft, Shield, Heart, UserX, Camera, AlertTriangle, CheckCircle } from 'lucide-react'

export const metadata = { title: 'Community Guidelines — Vibro' }

const RULES = [
  {
    icon: <Heart size={18} style={{ color: '#E8637A' }} />,
    title: 'Be Respectful',
    color: 'rgba(232,99,122,0.12)',
    body: 'Treat every member with dignity. Harassment, hate speech, bullying, or discriminatory language based on race, gender, sexuality, religion, disability, or nationality will result in an immediate ban.',
  },
  {
    icon: <CheckCircle size={18} style={{ color: '#2ECC71' }} />,
    title: 'Be Authentic',
    color: 'rgba(46,204,113,0.12)',
    body: 'Use your real name and genuine photos. Catfishing, impersonating others, using heavily filtered or AI-generated photos is prohibited. Misrepresentation undermines trust in the community.',
  },
  {
    icon: <Camera size={18} style={{ color: '#4A90E2' }} />,
    title: 'Appropriate Photos',
    color: 'rgba(74,144,226,0.12)',
    body: 'Keep photos appropriate for all audiences. No nudity, explicit content, or graphic imagery. Profile photos must show your face clearly. Photos of minors are never permitted.',
  },
  {
    icon: <Shield size={18} style={{ color: '#9B6DFF' }} />,
    title: 'Safety First',
    color: 'rgba(155,109,255,0.12)',
    body: 'Never share financial information or send money to someone you\'ve met on Vibro. Report any suspicious activity immediately. Always meet in public for first dates and tell a friend where you\'re going.',
  },
  {
    icon: <UserX size={18} style={{ color: '#F39C12' }} />,
    title: 'No Spam or Solicitation',
    color: 'rgba(243,156,18,0.12)',
    body: 'Commercial solicitation, MLM recruitment, advertising, or sending unsolicited links is prohibited. The platform is for genuine connections only.',
  },
  {
    icon: <AlertTriangle size={18} style={{ color: '#E74C3C' }} />,
    title: 'Report Violations',
    color: 'rgba(231,76,60,0.12)',
    body: 'Use the Report button (⋯ menu on any profile) to flag rule violations, fake profiles, or harmful content. Our Trust & Safety team reviews all reports within 24 hours.',
  },
]

export default function CommunityGuidelinesPage() {
  return (
    <div className="min-h-screen pt-nav pb-nav-bottom px-4">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/settings" className="text-white/50 hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-2xl font-bold text-white">Community Guidelines</h1>
        </div>

        <div className="glass rounded-2xl p-4 mb-5 flex items-start gap-3"
          style={{ border: '1px solid rgba(201,168,76,0.20)', background: 'rgba(201,168,76,0.05)' }}>
          <Shield size={18} style={{ color: '#C9A84C' }} className="mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-white mb-1">Our commitment to you</p>
            <p className="text-xs text-white/55 leading-relaxed">Vibro is built for real connections. These guidelines exist to keep our community safe, welcoming, and genuine. Violations may result in warnings, content removal, or permanent bans.</p>
          </div>
        </div>

        <div className="flex flex-col gap-3 mb-6">
          {RULES.map((rule, i) => (
            <div key={i} className="glass rounded-2xl p-4 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: rule.color }}>
                {rule.icon}
              </div>
              <div>
                <p className="text-sm font-semibold text-white mb-1">{rule.title}</p>
                <p className="text-xs text-white/55 leading-relaxed">{rule.body}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="glass rounded-2xl p-5 text-center">
          <p className="text-xs text-white/40 leading-relaxed">
            These guidelines are enforced at Vibro&apos;s sole discretion. By using the platform you agree to abide by them and our{' '}
            <Link href="/terms" className="underline text-white/60">Terms of Service</Link>.
            Last updated: June 2026.
          </p>
        </div>
      </div>
    </div>
  )
}
