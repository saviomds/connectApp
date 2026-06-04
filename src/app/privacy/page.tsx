import Link from 'next/link'
import { ArrowLeft, ScrollText, Shield, Eye, Database, Bell, Trash2 } from 'lucide-react'

export const metadata = { title: 'Privacy Preferences — Vibro' }

const SECTIONS = [
  {
    icon: <Database size={16} style={{ color: '#4A90E2' }} />,
    title: 'Data We Collect',
    items: [
      'Account information: email, name, age, photos, and profile details you provide.',
      'Usage data: pages visited, features used, swipe patterns (never sold to advertisers).',
      'Device data: device type, OS, app version, and IP address for security purposes.',
      'Location: city/country you enter manually. We do not collect precise GPS location.',
    ],
  },
  {
    icon: <Eye size={16} style={{ color: '#9B6DFF' }} />,
    title: 'How We Use Your Data',
    items: [
      'To operate the Service: show your profile to potential matches, deliver messages, and process payments.',
      'To improve the Service: analyze aggregate usage patterns to improve features (never at an individual level).',
      'To keep you safe: detect fraud, spam, and policy violations.',
      'To communicate: send match notifications, security alerts, and (if enabled) SMS updates.',
    ],
  },
  {
    icon: <Shield size={16} style={{ color: '#2ECC71' }} />,
    title: 'Data Sharing',
    items: [
      'We never sell your personal data to third parties.',
      'We share data with service providers (e.g. Stripe for payments, Supabase for hosting) strictly for operating the Service.',
      'We may share data with law enforcement when legally required.',
      'Match Group companies may share aggregated, anonymised analytics.',
    ],
  },
  {
    icon: <Bell size={16} style={{ color: '#C9A84C' }} />,
    title: 'Your Choices',
    items: [
      'Turn off email and SMS notifications in Settings → Notifications.',
      'Control who can see your profile via the Privacy section in Settings.',
      'Opt out of analytics by emailing privacy@vibro.app.',
      'Request a copy of your data or correction of inaccuracies at any time.',
    ],
  },
  {
    icon: <Trash2 size={16} style={{ color: '#E74C3C' }} />,
    title: 'Data Deletion',
    items: [
      'Delete your account from Settings → Danger Zone → Delete Account.',
      'Upon deletion, your profile is removed from discovery within 24 hours.',
      'Aggregated, anonymised data may be retained for analytics.',
      'Backups are purged within 30 days of account deletion.',
    ],
  },
]

export default function PrivacyPage() {
  return (
    <div className="min-h-screen pt-nav pb-nav-bottom px-4">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/settings" className="text-white/50 hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-2xl font-bold text-white">Privacy Preferences</h1>
        </div>

        <div className="glass rounded-2xl p-4 mb-5 flex items-center gap-3"
          style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
          <ScrollText size={16} className="text-white/40 shrink-0" />
          <p className="text-xs text-white/40">Effective date: June 4, 2026 · Match Group Privacy Framework</p>
        </div>

        <div className="flex flex-col gap-3 mb-6">
          {SECTIONS.map((s, i) => (
            <div key={i} className="glass rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-7 h-7 rounded-lg bg-white/[0.06] flex items-center justify-center">{s.icon}</span>
                <h2 className="text-sm font-semibold text-white">{s.title}</h2>
              </div>
              <ul className="flex flex-col gap-1.5">
                {s.items.map((item, j) => (
                  <li key={j} className="text-xs text-white/55 leading-relaxed flex gap-2">
                    <span className="text-white/20 shrink-0 mt-0.5">•</span> {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="glass rounded-2xl p-5 text-center">
          <p className="text-xs text-white/40 leading-relaxed">
            For privacy requests, contact{' '}
            <a href="mailto:privacy@vibro.app" className="underline text-white/60">privacy@vibro.app</a>.
            For EU/GDPR requests, see{' '}
            <a href="https://matchgroup.com/privacy" target="_blank" rel="noopener noreferrer" className="underline text-white/60">matchgroup.com/privacy</a>.
          </p>
        </div>
      </div>
    </div>
  )
}
