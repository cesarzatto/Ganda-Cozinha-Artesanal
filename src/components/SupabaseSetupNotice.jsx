import { Settings } from 'lucide-react'

export default function SupabaseSetupNotice() {
  return (
    <div className="min-h-full flex items-center justify-center p-6 bg-[var(--color-bg)]">
      <div className="max-w-sm text-center flex flex-col items-center gap-3">
        <div className="w-16 h-16 rounded-full bg-[var(--color-beige)] flex items-center justify-center">
          <Settings size={28} className="text-[var(--color-brown-mid)]" />
        </div>
        <h1 className="font-display text-2xl font-semibold">Falta configurar o banco de dados</h1>
        <p className="text-[var(--color-brown-mid)]">
          Siga o passo a passo em <code className="font-semibold">supabase/README.md</code> para criar o projeto
          Supabase gratuito e depois preencha o arquivo <code className="font-semibold">.env</code> com a URL e a
          chave do seu projeto.
        </p>
      </div>
    </div>
  )
}
