import { Banknote, QrCode, CreditCard, MoreHorizontal } from 'lucide-react'

export const FORMAS_PAGAMENTO = [
  { value: 'dinheiro', label: 'Dinheiro', icon: Banknote },
  { value: 'pix', label: 'Pix', icon: QrCode },
  { value: 'cartao', label: 'Cartão', icon: CreditCard },
  { value: 'outro', label: 'Outro', icon: MoreHorizontal },
]
