interface EmptyStateProps {
  icon: string
  title: string
  description: string
  action?: { label: string; href: string }
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div
        className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl mb-5 select-none"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        {icon}
      </div>
      <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--app-text)' }}>{title}</h3>
      <p className="text-sm max-w-xs leading-relaxed mb-6" style={{ color: 'var(--app-text-3)' }}>{description}</p>
      {action && (
        <a
          href={action.href}
          className="px-6 py-2.5 rounded-xl text-sm font-semibold text-black transition-opacity hover:opacity-85"
          style={{ background: 'linear-gradient(135deg,#C9A84C,#E5C76B)' }}
        >
          {action.label}
        </a>
      )}
    </div>
  )
}
