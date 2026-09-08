import { createClient } from '@supabase/supabase-js'

// .trim() protege contra espaço/quebra de linha a mais colado sem querer
// nas variáveis de ambiente (ex: no painel do Vercel) — sem isso, uma URL
// com espaço sobrando faz o createClient() estourar e a tela fica em
// branco, sem nenhuma mensagem de erro visível pra quem está usando.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

let client = null
let configurado = Boolean(supabaseUrl && supabaseAnonKey)

if (configurado) {
  try {
    client = createClient(supabaseUrl, supabaseAnonKey)
  } catch (err) {
    configurado = false
    console.error('[Ganda Cozinha Artesanal] VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY inválidos:', err)
  }
}

if (!configurado) {
  console.warn(
    '[Ganda Cozinha Artesanal] Supabase não configurado. Preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env (veja .env.example).',
  )
}

export const supabaseConfigured = configurado
export const supabase = client
