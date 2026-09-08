export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center text-center gap-3 py-14 px-6">
      {Icon && (
        <div className="w-16 h-16 rounded-full bg-[var(--color-beige)] flex items-center justify-center">
          <Icon size={28} className="text-[var(--color-brown-mid)]" />
        </div>
      )}
      <h2 className="font-display text-xl font-semibold">{title}</h2>
      {description && <p className="text-[var(--color-brown-mid)] max-w-xs">{description}</p>}
      {action}
    </div>
  )
}
