const VARIANTS = {
  primary: 'bg-[var(--color-brown-dark)] text-[var(--color-bg)] active:bg-[var(--color-brown-mid)]',
  secondary: 'bg-[var(--color-beige)] text-[var(--color-brown-dark)] active:bg-[var(--color-rose)]',
  outline:
    'bg-transparent text-[var(--color-brown-dark)] border-2 border-[var(--color-brown-dark)] active:bg-[var(--color-beige)]',
  danger: 'bg-[var(--color-alert)] text-white active:opacity-90',
}

export default function Button({
  children,
  variant = 'primary',
  className = '',
  type = 'button',
  fullWidth = true,
  ...props
}) {
  return (
    <button
      type={type}
      className={`min-h-[52px] rounded-2xl px-6 font-semibold text-base shadow-sm transition-colors disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 ${
        fullWidth ? 'w-full' : ''
      } ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
