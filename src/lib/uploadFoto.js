import { supabase } from './supabaseClient.js'

export async function uploadFotoProduto(file) {
  const ext = file.name.split('.').pop()
  const path = `${crypto.randomUUID()}.${ext}`

  const { error } = await supabase.storage.from('produtos').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  })
  if (error) throw error

  const { data } = supabase.storage.from('produtos').getPublicUrl(path)
  return data.publicUrl
}
