import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'
import { createClient } from '../../../../lib/supabase/server'

type Payload = {
  sessionId?: string
  bundle?: unknown
  dryRun?: boolean
}

const ERROR_MAP: Record<string, string> = {
  admin_required: 'Akun ini tidak memiliki akses editor.',
  published_session_requires_super_admin: 'Sesi published hanya dapat diimpor oleh Super Admin.',
  import_bundle_must_be_object: 'Format impor harus berupa object JSON.',
  import_collections_must_be_arrays: 'Field blocks dan questions harus berupa array.',
  import_bundle_empty: 'Tidak ada materi atau soal yang dapat diimpor.',
  too_many_import_blocks: 'Maksimal 500 blok materi dalam satu impor.',
  too_many_import_questions: 'Maksimal 300 soal dalam satu impor.',
  vocabulary_term_required: 'Ada kosakata tanpa kata Jepang.',
  vocabulary_meaning_required: 'Ada kosakata tanpa arti Indonesia.',
  kanji_character_required: 'Ada materi kanji tanpa karakter kanji.',
  kanji_meaning_required: 'Ada materi kanji tanpa arti.',
  grammar_pattern_required: 'Ada materi bunpou tanpa pola/judul.',
  reading_passage_required: 'Ada materi dokkai tanpa bacaan.',
  listening_script_or_audio_required: 'Ada materi choukai tanpa skrip maupun audio.',
  prompt_required: 'Ada soal tanpa pertanyaan.',
  invalid_option_count: 'Setiap soal harus memiliki 2–6 pilihan jawaban.',
  option_text_required: 'Ada pilihan jawaban yang kosong.',
  exactly_one_correct_option_required: 'Setiap soal harus memiliki tepat satu jawaban benar.',
  session_quiz_not_found: 'Kuis sesi belum tersedia untuk menerima soal.',
}

function response(data: unknown, status = 200) {
  const res = NextResponse.json(data, { status })
  res.headers.set('Cache-Control', 'private, no-store')
  return res
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return response({ error: 'Sesi login berakhir.' }, 401)

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'content_admin' && profile?.role !== 'super_admin') {
    return response({ error: 'Akun ini tidak memiliki akses editor.' }, 403)
  }

  const body = await request.json().catch(() => null) as Payload | null
  const sessionId = typeof body?.sessionId === 'string' ? body.sessionId : ''
  const bundle = body?.bundle
  const dryRun = body?.dryRun !== false

  if (!sessionId || !bundle || typeof bundle !== 'object' || Array.isArray(bundle)) {
    return response({ error: 'Format impor tidak valid.' }, 400)
  }

  const result = await supabase.rpc('admin_import_session_bundle', {
    p_session_id: sessionId,
    p_bundle: bundle,
    p_dry_run: dryRun,
  })

  if (result.error) {
    const key = result.error.message || 'import_failed'
    return response({ error: ERROR_MAP[key] || key.replaceAll('_', ' ') }, 400)
  }

  if (!dryRun) {
    revalidatePath('/portal/admin')
    revalidatePath(`/portal/admin/session/${sessionId}`)
    revalidatePath(`/portal/admin/session/${sessionId}/preview`)
    revalidatePath(`/portal/session/${sessionId}`)
    revalidatePath('/portal/materi')
    revalidatePath('/portal/dashboard')
  }

  return response({ ok: true, result: result.data })
}
