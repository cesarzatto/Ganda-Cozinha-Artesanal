import Button from './Button.jsx'

export default function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'danger',
  onConfirm,
  onCancel,
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl">
        <h2 className="font-display text-xl font-semibold mb-2">{title}</h2>
        {description && <p className="text-[var(--color-brown-mid)] mb-6">{description}</p>}
        <div className="flex flex-col gap-3">
          <Button variant={variant} onClick={onConfirm}>
            {confirmLabel}
          </Button>
          <Button variant="outline" onClick={onCancel}>
            {cancelLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
