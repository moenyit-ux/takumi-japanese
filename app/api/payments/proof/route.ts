import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../../../lib/supabase/server'

const MAX_SIZE = 10 * 1024 * 1024
const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Silakan masuk terlebih dahulu.' }, { status: 401 })

  const form = await request.formData()
  const file = form.get('file')

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Bukti pembayaran belum dipilih.' }, { status: 400 })
  }
  if (!EXTENSIONS[file.type]) {
    return NextResponse.json({ error: 'Format bukti harus JPG, PNG, WebP, atau PDF.' }, { status: 400 })
  }
  if (file.size <= 0 || file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'Ukuran bukti pembayaran maksimal 10 MB.' }, { status: 400 })
  }

  const year = new Date().getUTCFullYear()
  const path = `${user.id}/${year}/${crypto.randomUUID()}.${EXTENSIONS[file.type]}`
  const { error } = await supabase.storage.from('payment-proofs').upload(path, file, {
    contentType: file.type,
    upsert: false,
    cacheControl: '3600',
  })

  if (error) {
    return NextResponse.json({ error: `Upload bukti gagal: ${error.message}` }, { status: 400 })
  }

  return NextResponse.json({
    ok: true,
    proofUrl: `storage://payment-proofs/${path}`,
  })
}
