import Link from 'next/link'
import { ArrowLeft, FileText } from 'lucide-react'

export const metadata = { title: 'Terms of Service — Vibro' }

const SECTIONS = [
  {
    title: '1. Acceptance of Terms',
    body: 'By accessing or using Vibro ("the Service"), you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree to these terms, do not use the Service. Vibro is operated by Match Group LLC and its subsidiaries.',
  },
  {
    title: '2. Eligibility',
    body: 'You must be at least 18 years old to use Vibro. By creating an account, you confirm that you are 18 or older, and that you have the right, authority, and capacity to enter into these terms.',
  },
  {
    title: '3. Your Account',
    body: 'You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. You must provide accurate information and update it as needed. Do not share your password or allow others to access your account.',
  },
  {
    title: '4. Acceptable Use',
    body: 'You agree not to: (a) post false, misleading, or inappropriate content; (b) harass, threaten, or harm other users; (c) use the Service for commercial solicitation or spam; (d) attempt to reverse-engineer, scrape, or copy the Service; (e) violate any applicable laws or regulations.',
  },
  {
    title: '5. Content You Post',
    body: 'You retain ownership of content you post. By posting, you grant Vibro a worldwide, non-exclusive, royalty-free licence to use, display, and distribute your content to operate the Service. You represent that you have all rights to post such content.',
  },
  {
    title: '6. Premium Services & Billing',
    body: 'Certain features require a paid subscription (Gold or Platinum). Subscriptions auto-renew unless cancelled before the renewal date. All charges are in USD unless stated otherwise. We do not offer refunds for partially used subscription periods except where required by law.',
  },
  {
    title: '7. Termination',
    body: 'We may suspend or terminate your account at any time for violations of these Terms or for any reason at our discretion. You may delete your account at any time from Settings. Termination does not entitle you to a refund of any paid subscription.',
  },
  {
    title: '8. Disclaimers & Limitation of Liability',
    body: 'The Service is provided "as is" without warranties of any kind. Vibro does not guarantee that you will find a match or form any particular relationship. To the maximum extent permitted by law, Vibro\'s liability to you for any claims is limited to the amount you paid us in the 12 months prior to the claim.',
  },
  {
    title: '9. Dispute Resolution',
    body: 'Any disputes between you and Vibro shall be resolved by binding individual arbitration. You waive any right to a jury trial or class action. This agreement is governed by the laws of the State of Delaware, USA.',
  },
  {
    title: '10. Changes to Terms',
    body: 'We may update these Terms at any time. We\'ll notify you of material changes via email or an in-app notice at least 30 days before they take effect. Continued use of the Service after changes constitutes acceptance.',
  },
]

export default function TermsPage() {
  return (
    <div className="min-h-screen pt-nav pb-nav-bottom px-4">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/settings" className="text-white/50 hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-2xl font-bold text-white">Terms of Service</h1>
        </div>

        <div className="glass rounded-2xl p-4 mb-5 flex items-center gap-3"
          style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
          <FileText size={16} className="text-white/40 shrink-0" />
          <p className="text-xs text-white/40">Effective date: June 4, 2026 · Part of Match Group</p>
        </div>

        <div className="flex flex-col gap-3 mb-6">
          {SECTIONS.map((s, i) => (
            <div key={i} className="glass rounded-2xl p-5">
              <h2 className="text-sm font-semibold text-white mb-2">{s.title}</h2>
              <p className="text-xs text-white/55 leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>

        <div className="text-center text-xs text-white/30 pb-2">
          Questions? <a href="mailto:legal@vibro.app" className="underline text-white/50">legal@vibro.app</a>
        </div>
      </div>
    </div>
  )
}
