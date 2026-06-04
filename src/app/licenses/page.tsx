import Link from 'next/link'
import { ArrowLeft, Scale } from 'lucide-react'

export const metadata = { title: 'Licenses — Vibro' }

const LICENSES = [
  { name: 'Next.js', author: 'Vercel Inc.', license: 'MIT', url: 'https://nextjs.org' },
  { name: 'React', author: 'Meta Platforms, Inc.', license: 'MIT', url: 'https://reactjs.org' },
  { name: 'Supabase', author: 'Supabase Inc.', license: 'Apache 2.0', url: 'https://supabase.com' },
  { name: 'Tailwind CSS', author: 'Tailwind Labs Inc.', license: 'MIT', url: 'https://tailwindcss.com' },
  { name: 'Framer Motion', author: 'Framer B.V.', license: 'MIT', url: 'https://www.framer.com/motion' },
  { name: 'Lucide React', author: 'Lucide Contributors', license: 'ISC', url: 'https://lucide.dev' },
  { name: 'Stripe', author: 'Stripe Inc.', license: 'Apache 2.0', url: 'https://stripe.com' },
  { name: 'clsx', author: 'Luke Edwards', license: 'MIT', url: 'https://github.com/lukeed/clsx' },
  { name: 'Geist Font', author: 'Vercel Inc.', license: 'OFL-1.1', url: 'https://vercel.com/font' },
  { name: 'TypeScript', author: 'Microsoft Corporation', license: 'Apache 2.0', url: 'https://www.typescriptlang.org' },
]

const LICENSE_TEXTS: Record<string, string> = {
  MIT: 'Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files, to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software.',
  'Apache 2.0': 'Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0.',
  ISC: 'Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all copies.',
  'OFL-1.1': 'This Font Software is licensed under the SIL Open Font License, Version 1.1. This license is copied below, and is also available with a FAQ at: http://scripts.sil.org/OFL.',
}

export default function LicensesPage() {
  return (
    <div className="min-h-screen pt-nav pb-nav-bottom px-4">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/settings" className="text-white/50 hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-2xl font-bold text-white">Licenses</h1>
        </div>

        <div className="glass rounded-2xl p-4 mb-5 flex items-center gap-3"
          style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
          <Scale size={16} className="text-white/40 shrink-0" />
          <p className="text-xs text-white/40">Open-source and third-party software used by Vibro</p>
        </div>

        <div className="flex flex-col gap-2 mb-6">
          {LICENSES.map(lib => (
            <div key={lib.name} className="glass rounded-2xl px-5 py-4">
              <div className="flex items-center justify-between mb-1">
                <a href={lib.url} target="_blank" rel="noopener noreferrer"
                  className="text-sm font-semibold text-white hover:underline">{lib.name}</a>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white/60 bg-white/[0.08]">{lib.license}</span>
              </div>
              <p className="text-xs text-white/40">© {lib.author}</p>
            </div>
          ))}
        </div>

        <div className="glass rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-white mb-3">License Texts</h2>
          <div className="flex flex-col gap-4">
            {Object.entries(LICENSE_TEXTS).map(([name, text]) => (
              <div key={name}>
                <p className="text-xs font-bold text-white/50 mb-1.5">{name} License</p>
                <p className="text-[11px] text-white/35 leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
