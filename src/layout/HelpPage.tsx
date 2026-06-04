'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ChevronDown, ChevronUp, Mail, MessageCircle, Shield, Zap, Heart, Lock, CreditCard, UserX } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'

interface FAQ {
  q: string
  a: string
  icon: React.ReactNode
}

const FAQS: FAQ[] = [
  {
    icon: <Heart size={15} style={{ color: '#E8637A' }} />,
    q: 'How does matching work?',
    a: 'When two users both swipe right (like) on each other, a match is created. You can then start a conversation. Super Likes increase your chances — the other person sees a star badge on your card.',
  },
  {
    icon: <Zap size={15} style={{ color: '#C9A84C' }} />,
    q: 'What is a Profile Boost?',
    a: 'A Boost puts your profile at the top of the discovery feed for 30 minutes, dramatically increasing your visibility. You can buy boosts individually or get them included with Premium memberships.',
  },
  {
    icon: <Shield size={15} style={{ color: '#4A90E2' }} />,
    q: 'How do I verify my profile?',
    a: 'Go to your profile and tap "Get Verified". You\'ll need to upload a selfie and a government-issued ID. Our team reviews requests within 24–48 hours. Verified profiles get a blue badge and more trust from other users.',
  },
  {
    icon: <Lock size={15} style={{ color: '#9B6DFF' }} />,
    q: 'Is my data safe?',
    a: 'Yes. We use industry-standard encryption for all data in transit and at rest. We never sell your personal information to third parties. See our Privacy Preferences page for full details on data handling.',
  },
  {
    icon: <CreditCard size={15} style={{ color: '#C9A84C' }} />,
    q: 'How do I cancel my Premium subscription?',
    a: 'You can cancel anytime from Settings → Account → Subscription, or directly through your Apple App Store / Google Play subscription manager. Cancelling stops future charges but keeps access until the end of the current billing period.',
  },
  {
    icon: <MessageCircle size={15} style={{ color: '#00D4AA' }} />,
    q: 'Why can\'t I send messages?',
    a: 'On Vibro, messaging requires a mutual match first. If you\'re already matched and can\'t send messages, check your internet connection. If the issue persists, try reloading the page or updating the app.',
  },
  {
    icon: <UserX size={15} style={{ color: '#E74C3C' }} />,
    q: 'How do I report or block someone?',
    a: 'On any profile card, tap the ⋯ menu (three dots) and choose "Report" or "Block". Reports are reviewed by our Trust & Safety team within 24 hours. Blocked users can never see your profile or contact you.',
  },
  {
    icon: <Zap size={15} style={{ color: '#2ECC71' }} />,
    q: 'What is "Free Tonight"?',
    a: '"Free Tonight" is a status toggle in Settings that signals you\'re available to meet up today. Other users browsing the Explore page can filter for people who are free tonight, making spontaneous meetups easier.',
  },
  {
    icon: <Heart size={15} style={{ color: '#E8637A' }} />,
    q: 'What is Double Date?',
    a: 'Double Date mode lets two matched couples connect with each other for a group outing. Both partners in a match need to activate Double Date mode. Once active, you\'ll see other couples who are also looking for a double date.',
  },
]

function FAQItem({ faq, defaultOpen }: { faq: FAQ; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen ?? false)
  return (
    <div className="glass rounded-2xl overflow-hidden">
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-white/[0.03] transition-colors">
        <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-white/[0.06]">{faq.icon}</span>
        <span className="flex-1 text-sm font-medium text-white leading-snug">{faq.q}</span>
        {open ? <ChevronUp size={16} className="text-white/30 shrink-0" /> : <ChevronDown size={16} className="text-white/30 shrink-0" />}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="px-5 pb-4 text-sm text-white/55 leading-relaxed border-t border-white/[0.05]" style={{ paddingTop: 12 }}>
              {faq.a}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function HelpPage() {
  return (
    <div className="min-h-screen pt-nav pb-nav-bottom px-4">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/settings" className="text-white/50 hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-2xl font-bold text-white">Help &amp; Support</h1>
        </div>

        {/* Contact */}
        <div className="glass rounded-2xl p-5 mb-6 flex items-center gap-4"
          style={{ border: '1px solid rgba(201,168,76,0.20)' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(201,168,76,0.12)' }}>
            <Mail size={18} style={{ color: '#C9A84C' }} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">Need direct help?</p>
            <p className="text-xs text-white/45 mt-0.5">Our team replies within 24 hours</p>
          </div>
          <a href="mailto:support@vibro.app"
            className="px-3 py-1.5 rounded-xl text-xs font-bold text-black shrink-0"
            style={{ background: '#C9A84C' }}>Email us</a>
        </div>

        {/* FAQ */}
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-3 px-1">Frequently Asked Questions</p>
          <div className="flex flex-col gap-2">
            {FAQS.map((faq, i) => <FAQItem key={i} faq={faq} defaultOpen={i === 0} />)}
          </div>
        </div>

        {/* Links */}
        <div className="glass rounded-2xl overflow-hidden divide-y divide-white/[0.05]">
          {([
            { href: '/community-guidelines', label: 'Community Guidelines' },
            { href: '/terms', label: 'Terms of Service' },
            { href: '/privacy', label: 'Privacy Preferences' },
          ]).map(({ href, label }) => (
            <Link key={href} href={href}
              className="flex items-center justify-between px-5 py-4 hover:bg-white/[0.03] transition-colors">
              <span className="text-sm text-white/60">{label}</span>
              <span className="text-white/20 text-xs">→</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
