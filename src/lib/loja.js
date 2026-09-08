// Número de WhatsApp que recebe os pedidos feitos pela loja pública (/loja).
// Formato: código do país (55) + DDD + número, só dígitos.
export const WHATSAPP_LOJA = '5511975753789'

export function linkWhatsAppPedido({ nome, itens, total, formaPagamentoLabel }) {
  const linhas = itens.map((item) => `${item.linha} - ${item.subtotalFormatado}`)
  const texto = [
    'Olá! Gostaria de fazer um pedido:',
    '',
    ...linhas,
    '',
    `Total: ${total}`,
    '',
    `Nome: ${nome}`,
    ...(formaPagamentoLabel ? [`Pagamento: ${formaPagamentoLabel}`] : []),
  ].join('\n')

  return `https://wa.me/${WHATSAPP_LOJA}?text=${encodeURIComponent(texto)}`
}
